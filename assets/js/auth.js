// assets/js/auth.js
(function (global) {
  'use strict';

  const state = {
    user: null,
    role: 'sin_acceso',
    storeKey: null,
    ready: false,
    authorized: false
  };

  let resolveReady = null;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  function markReady() {
    if (state.ready) return;
    state.ready = true;
    if (typeof resolveReady === 'function') {
      resolveReady(state);
      resolveReady = null;
    }
  }

  function getAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('Firebase Auth no está disponible.');
    }
    return firebase.auth();
  }

  function normalizeRole(role) {
    return String(role || 'sin_acceso').trim().toLowerCase() || 'sin_acceso';
  }

  function getRoleLabel(role) {
    const normalized = normalizeRole(role);
    const labels = {
      admin: 'Administrador',
      supervisor: 'Bodega',
      operador: 'Tienda',
      'sin_acceso': 'Sin acceso'
    };
    return labels[normalized] || normalized;
  }

  function getRoleChipClass(role) {
    const normalized = normalizeRole(role);
    if (normalized === 'admin') return 'is-admin';
    if (normalized === 'supervisor') return 'is-supervisor';
    if (normalized === 'operador') return 'is-operator';
    return 'is-denied';
  }

  function getCompactRoleLabel(role) {
    const normalized = normalizeRole(role);
    const labels = {
      admin: 'Admin',
      supervisor: 'Bodega',
      operador: 'Tienda',
      'sin_acceso': 'Sin acceso'
    };
    return labels[normalized] || getRoleLabel(normalized);
  }

  function shouldUseCompactRoleLabel() {
    try {
      return !!global.matchMedia && global.matchMedia('(max-width: 575.98px)').matches;
    } catch (_) {
      return false;
    }
  }

  function syncAuthRoleChipLabel() {
    const ui = getUi();
    if (!ui.authRoleChip) return;
    const fullLabel = ui.authRoleChip.dataset.fullLabel || ui.authRoleChip.textContent || 'Rol';
    const compactLabel = ui.authRoleChip.dataset.compactLabel || fullLabel;
    ui.authRoleChip.textContent = shouldUseCompactRoleLabel() ? compactLabel : fullLabel;
  }

  function isMenuActionVisible(id) {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('d-none') && el.getAttribute('aria-hidden') !== 'true';
  }

  function refreshAuthMenuDividers() {
    const divider = document.getElementById('authBeforeLogoutDivider');
    if (!divider) return;
    const hasVisibleAction = [
      'btnAdminPanel',
      'btnOperationalView',
      'btnAuthWarehouseNotifications'
    ].some(isMenuActionVisible);
    divider.classList.toggle('d-none', !hasVisibleAction);
    divider.setAttribute('aria-hidden', String(!hasVisibleAction));
  }

  function getUi() {
    return {
      authGate: document.getElementById('authGate'),
      loginForm: document.getElementById('loginForm'),
      loginEmail: document.getElementById('loginEmail'),
      loginPassword: document.getElementById('loginPassword'),
      loginSubmit: document.getElementById('loginSubmit'),
      authStatusText: document.getElementById('authStatusText'),
      authErrorBox: document.getElementById('authErrorBox'),
      authErrorText: document.getElementById('authErrorText'),
      authDeniedBox: document.getElementById('authDeniedBox'),
      authDeniedText: document.getElementById('authDeniedText'),
      authUserNav: document.getElementById('authUserNav'),
      authUserLabel: document.getElementById('authUserLabel'),
      authRoleChip: document.getElementById('authRoleChip'),
      btnAdminPanel: document.getElementById('btnAdminPanel'),
      btnOperationalView: document.getElementById('btnOperationalView'),
      btnLogout: document.getElementById('btnLogout'),
      btnDeniedLogout: document.getElementById('btnDeniedLogout')
    };
  }

  function setBusy(isBusy, message = '') {
    const ui = getUi();
    if (ui.loginSubmit) {
      ui.loginSubmit.disabled = !!isBusy;
      ui.loginSubmit.setAttribute('aria-disabled', String(!!isBusy));
      ui.loginSubmit.innerHTML = isBusy
        ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span><span>Ingresando...</span>'
        : '<i class="fa-solid fa-right-to-bracket me-2" aria-hidden="true"></i><span>Ingresar</span>';
    }

    if (ui.loginEmail) ui.loginEmail.disabled = !!isBusy;
    if (ui.loginPassword) ui.loginPassword.disabled = !!isBusy;

    if (message) {
      setStatus(message);
    }
  }

  function setStatus(message = '') {
    const ui = getUi();
    if (ui.authStatusText) {
      ui.authStatusText.textContent = message || '';
    }
  }

  function showError(message = '') {
    const ui = getUi();
    if (!ui.authErrorBox || !ui.authErrorText) return;
    ui.authErrorText.textContent = message || 'No se pudo iniciar sesión.';
    ui.authErrorBox.classList.toggle('d-none', !message);
  }

  function showDenied(message = '') {
    const ui = getUi();
    if (!ui.authDeniedBox || !ui.authDeniedText) return;
    ui.authDeniedText.textContent = message || 'Tu usuario no tiene acceso a esta aplicación.';
    ui.authDeniedBox.classList.toggle('d-none', !message);
  }

  function setAuthGateVisible(visible) {
    const ui = getUi();
    if (!ui.authGate) return;
    ui.authGate.classList.toggle('d-none', !visible);
    ui.authGate.setAttribute('aria-hidden', String(!visible));
    document.body.classList.toggle('auth-gate-open', !!visible);
  }

  function renderSignedInUser(user, role) {
    const ui = getUi();
    const email = String(user?.email || '').trim();

    if (ui.authUserNav) {
      ui.authUserNav.classList.toggle('d-none', !email);
    }

    if (ui.authUserLabel) {
      ui.authUserLabel.textContent = email || 'Sesión activa';
    }

    if (ui.authRoleChip) {
      const label = getRoleLabel(role);
      const compactLabel = getCompactRoleLabel(role);
      ui.authRoleChip.dataset.fullLabel = label;
      ui.authRoleChip.dataset.compactLabel = compactLabel;
      ui.authRoleChip.textContent = shouldUseCompactRoleLabel() ? compactLabel : label;
      ui.authRoleChip.title = 'Rol: ' + label;
      ui.authRoleChip.className = 'auth-role-chip ' + getRoleChipClass(role);
      ui.authRoleChip.classList.remove('d-none');
    }

    const normalizedRole = normalizeRole(role);
    const isAdmin = normalizedRole === 'admin';
    if (ui.btnAdminPanel) ui.btnAdminPanel.classList.toggle('d-none', !isAdmin);
    if (ui.btnOperationalView) ui.btnOperationalView.classList.toggle('d-none', !isAdmin);
    refreshAuthMenuDividers();

    document.body.dataset.userRole = normalizedRole;
    if (email) {
      document.body.dataset.userEmail = email;
    } else {
      delete document.body.dataset.userEmail;
    }
  }

  async function syncUserAccess(user) {
    const idToken = await user.getIdToken();

    const response = await fetch('/api/assign-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + idToken
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email || ''
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'No se pudo sincronizar el acceso.')
    }

    await user.getIdToken(true);
    const tokenResult = await user.getIdTokenResult();
    return {
      role: normalizeRole(tokenResult?.claims?.role || data.role || 'sin_acceso'),
      storeKey: String(tokenResult?.claims?.storeKey || data.storeKey || '').trim() || null
    };
  }

  async function signOutUser(options = {}) {
    const { reload = false } = options || {};

    try {
      await getAuth().signOut();
    } finally {
      state.user = null;
      state.role = 'sin_acceso';
      state.storeKey = null;
      state.authorized = false;
      if (reload) {
        global.location.reload();
      }
    }
  }

  async function applySession(user) {
    showError('');
    showDenied('');

    if (!user) {
      state.user = null;
      state.role = 'sin_acceso';
      state.storeKey = null;
      state.authorized = false;
      renderSignedInUser(null, 'sin_acceso');
      setAuthGateVisible(true);
      setBusy(false);
      setStatus('Ingresa con tu usuario autorizado para continuar.');
      markReady();
      return;
    }

    setAuthGateVisible(true);
    setBusy(true, 'Validando acceso...');
    renderSignedInUser(user, 'sin_acceso');

    try {
      const access = await syncUserAccess(user);
      state.user = user;
      state.role = access.role;
      state.storeKey = access.storeKey || null;
      state.authorized = access.role !== 'sin_acceso';

      renderSignedInUser(user, access.role);

      if (!state.authorized) {
        setBusy(false);
        setStatus('Cuenta autenticada, pero sin permisos para usar TRLista.');
        showDenied('Tu usuario no está autorizado para ingresar a TRLista. Usa una cuenta asignada o cierra sesión.');
        setAuthGateVisible(true);
      } else {
        setBusy(false);
        setStatus('');
        setAuthGateVisible(false);
      }
    } catch (error) {
      console.error('Error sincronizando rol:', error);
      state.user = user;
      state.role = 'sin_acceso';
      state.storeKey = null;
      state.authorized = false;
      renderSignedInUser(user, 'sin_acceso');
      setBusy(false);
      setStatus('No se pudo validar tu acceso.');
      showError(String(error?.message || error || 'No se pudo validar tu acceso.'));
      setAuthGateVisible(true);
    } finally {
      markReady();
    }
  }

  function bindUi() {
    const ui = getUi();
    if (ui.loginForm && !ui.loginForm.dataset.bound) {
      ui.loginForm.dataset.bound = 'true';
      ui.loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showError('');
        showDenied('');

        const email = String(ui.loginEmail?.value || '').trim();
        const password = String(ui.loginPassword?.value || '');

        if (!email || !password) {
          showError('Debes ingresar usuario y contraseña.');
          return;
        }

        try {
          setBusy(true, 'Autenticando...');
          const auth = getAuth();
          await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
          const result = await auth.signInWithEmailAndPassword(email, password);
          await applySession(result.user);
          if (state.authorized) {
            global.location.reload();
          }
        } catch (error) {
          console.error('Login error:', error);
          setBusy(false);
          setStatus('No se pudo iniciar sesión.');
          showError(String(error?.message || error || 'No se pudo iniciar sesión.'));
        }
      });
    }

    if (ui.btnLogout && !ui.btnLogout.dataset.bound) {
      ui.btnLogout.dataset.bound = 'true';
      ui.btnLogout.addEventListener('click', async () => {
        await signOutUser({ reload: true });
      });
    }

    if (ui.btnDeniedLogout && !ui.btnDeniedLogout.dataset.bound) {
      ui.btnDeniedLogout.dataset.bound = 'true';
      ui.btnDeniedLogout.addEventListener('click', async () => {
        await signOutUser({ reload: true });
      });
    }
  }

  function startAuthObserver() {
    try {
      getAuth().onAuthStateChanged((user) => {
        applySession(user);
      });
    } catch (error) {
      console.error('Firebase Auth no disponible:', error);
      showError(String(error?.message || error || 'Firebase Auth no está disponible.'));
      setAuthGateVisible(true);
      markReady();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindUi();
    setAuthGateVisible(true);
    setStatus('Validando sesión...');
    refreshAuthMenuDividers();
    syncAuthRoleChipLabel();
    try { global.addEventListener('resize', syncAuthRoleChipLabel, { passive: true }); } catch (_) {}
    startAuthObserver();
  });

  global.TRAuth = {
    waitForReady: () => readyPromise,
    getCurrentUser: () => state.user,
    getCurrentRole: () => state.role,
    getCurrentStoreKey: () => state.storeKey,
    isAuthorized: () => !!state.authorized,
    refreshMenuDividers: refreshAuthMenuDividers,
    syncRoleChipLabel: syncAuthRoleChipLabel,
    signOutUser
  };
})(window);
