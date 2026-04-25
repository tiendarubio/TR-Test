import crypto from 'node:crypto';

const DEFAULT_UNLOCK_SCOPES = Object.freeze(['historical', 'protected']);
const DEFAULT_UNLOCK_TTL_MINUTES = 15;

function normalizeScopes(scopes = []) {
  const values = Array.isArray(scopes) ? scopes : [scopes];

  return [...new Set(
    values
      .map(scope => String(scope || '').trim())
      .filter(Boolean)
  )].sort();
}

function toBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getUnlockSessionSecret(apiKey, sheetId) {
  return process.env.UNLOCK_SESSION_SECRET || `${apiKey}:${sheetId}:unlock-session`;
}

function safeCompareStrings(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function resolveExpectedPassword(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!normalized) return { mode: 'plain', value: '' };

  if (normalized.startsWith('sha256:')) {
    return {
      mode: 'sha256',
      value: normalized.slice('sha256:'.length).trim().toLowerCase()
    };
  }

  return {
    mode: 'plain',
    value: normalized
  };
}

function passwordMatches(password, expectedPasswordRaw) {
  const normalizedPassword = String(password || '').trim();
  const expectedPassword = resolveExpectedPassword(expectedPasswordRaw);

  if (!normalizedPassword || !expectedPassword.value) {
    return false;
  }

  if (expectedPassword.mode === 'sha256') {
    const passwordHash = crypto
      .createHash('sha256')
      .update(normalizedPassword, 'utf8')
      .digest('hex');

    return safeCompareStrings(passwordHash, expectedPassword.value);
  }

  return safeCompareStrings(normalizedPassword, expectedPassword.value);
}

function signUnlockToken({ scopes, expiresAt }, secret) {
  const payload = {
    scopes: normalizeScopes(scopes),
    expiresAt,
    nonce: crypto.randomUUID()
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyUnlockToken(token, secret, requiredScopes = []) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken || !normalizedToken.includes('.')) {
    return { ok: false };
  }

  const [encodedPayload, providedSignature] = normalizedToken.split('.');
  if (!encodedPayload || !providedSignature) {
    return { ok: false };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  if (!safeCompareStrings(expectedSignature, providedSignature)) {
    return { ok: false };
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch (_) {
    return { ok: false };
  }

  const expiresAtMs = Date.parse(String(payload?.expiresAt || ''));
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return { ok: false };
  }

  const tokenScopes = new Set(normalizeScopes(payload?.scopes || []));
  const scopes = normalizeScopes(requiredScopes);

  if (!scopes.every(scope => tokenScopes.has(scope))) {
    return { ok: false };
  }

  return {
    ok: true,
    scopes: [...tokenScopes],
    expiresAt: new Date(expiresAtMs).toISOString()
  };
}

function getUnlockTtlMinutes() {
  const ttl = Number.parseInt(process.env.UNLOCK_SESSION_TTL_MINUTES || '', 10);
  if (Number.isFinite(ttl) && ttl > 0) {
    return ttl;
  }
  return DEFAULT_UNLOCK_TTL_MINUTES;
}

async function fetchExpectedPassword({ apiKey, sheetId, range }) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    console.error('unlock password sheet error', response.status, text);
    throw new Error('No se pudo consultar la configuración de desbloqueo.');
  }

  const data = await response.json();
  return String(data?.values?.[0]?.[0] || '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_UNLOCK_SHEET_ID || process.env.GOOGLE_SHEETS_ID;
    const range = process.env.GOOGLE_SHEETS_UNLOCK_RANGE || 'estantes!G2';

    if (!apiKey || !sheetId) {
      return res.status(500).json({
        ok: false,
        error: 'Faltan variables de entorno para validar el desbloqueo.'
      });
    }

    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const mode = String(body.mode || 'password').trim().toLowerCase();
    const scopes = normalizeScopes(body.scopes || DEFAULT_UNLOCK_SCOPES);
    const sessionSecret = getUnlockSessionSecret(apiKey, sheetId);

    if (mode === 'token') {
      const tokenResult = verifyUnlockToken(body.token, sessionSecret, scopes);

      if (!tokenResult.ok) {
        return res.status(401).json({
          ok: false,
          error: 'La sesión de desbloqueo expiró o no es válida.'
        });
      }

      return res.status(200).json({
        ok: true,
        scopes: tokenResult.scopes,
        expiresAt: tokenResult.expiresAt
      });
    }

    const password = String(body.password || '').trim();
    if (!password) {
      return res.status(400).json({ ok: false, error: 'Debes enviar la contraseña.' });
    }

    const expectedPassword = await fetchExpectedPassword({ apiKey, sheetId, range });

    if (!expectedPassword) {
      return res.status(500).json({
        ok: false,
        error: 'No se encontró una contraseña de desbloqueo configurada.'
      });
    }

    if (!passwordMatches(password, expectedPassword)) {
      return res.status(200).json({ ok: false });
    }

    const ttlMinutes = getUnlockTtlMinutes();
    const expiresAt = new Date(Date.now() + (ttlMinutes * 60 * 1000)).toISOString();
    const token = signUnlockToken({ scopes, expiresAt }, sessionSecret);

    return res.status(200).json({
      ok: true,
      token,
      expiresAt,
      scopes
    });
  } catch (err) {
    console.error('validate-historical-password error', err);
    return res.status(500).json({
      ok: false,
      error: 'Error interno validando el desbloqueo.'
    });
  }
}
