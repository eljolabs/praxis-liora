/* ==========================================================================
   Praxis LIORA — Verhalten
   Alles hier ist Verbesserung, keine Voraussetzung: Navigation, Formular und
   Inhalte funktionieren auch ohne JavaScript.
   ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------
     VERSAND DES KONTAKTFORMULARS — hier wird umgestellt.

     Solange der Wert mit "https://formspree.io/f/DEIN" beginnt, gilt das
     Formular als nicht scharf geschaltet: Es öffnet dann das Mailprogramm
     der Besucherin mit fertig ausgefüllter Nachricht. So ist die Seite
     schon vor der Einrichtung benutzbar.

     Scharf schalten: auf formspree.io ein Formular für info@praxis-liora.ch
     anlegen und die vollständige Endpunkt-URL unten eintragen.
     Später auf eigenen Versand (z. B. Purelymail) wechseln: nur diese
     Konstante und ggf. sendViaEndpoint() unten anpassen.
     -------------------------------------------------------------------- */
  var FORM_ENDPOINT = 'https://formspree.io/f/DEIN_FORMULAR_ID';
  var PRAXIS_MAIL = 'info@praxis-liora.ch';

  var isConfigured = FORM_ENDPOINT.indexOf('DEIN_FORMULAR_ID') === -1;

  /* ── Mobiles Menü ─────────────────────────────────────────────────── */

  function initMenu() {
    var header = document.querySelector('.site-header');
    var toggle = document.querySelector('.nav-toggle');
    if (!header || !toggle) return;

    function setOpen(open) {
      header.dataset.menu = open ? 'open' : 'closed';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    }

    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(header.dataset.menu !== 'open');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.dataset.menu === 'open') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Klick ausserhalb schliesst das Menü
    document.addEventListener('click', function (e) {
      if (header.dataset.menu === 'open' && !header.contains(e.target)) setOpen(false);
    });

    // Beim Wechsel auf Desktopbreite den Zustand zurücksetzen
    var wide = window.matchMedia('(min-width: 960px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }

  /* ── Formular ─────────────────────────────────────────────────────── */

  // Verständliche Meldungen statt der Standardtexte des Browsers
  var MESSAGES = {
    name: { valueMissing: 'Bitte geben Sie Ihren Namen an.' },
    email: {
      valueMissing: 'Bitte geben Sie Ihre E-Mail-Adresse an, damit ich antworten kann.',
      typeMismatch: 'Diese E-Mail-Adresse scheint unvollständig zu sein — bitte prüfen Sie sie.'
    },
    tel: { patternMismatch: 'Bitte geben Sie eine gültige Telefonnummer an.' },
    nachricht: {}
  };

  function applyValidationMessage(field) {
    var rules = MESSAGES[field.name] || {};
    field.setCustomValidity('');
    if (field.validity.valid) return;
    for (var key in rules) {
      if (field.validity[key]) { field.setCustomValidity(rules[key]); return; }
    }
  }

  function initForm() {
    var form = document.getElementById('kontaktformular');
    if (!form) return;

    var statusBox = form.querySelector('.form__status');
    var statusText = form.querySelector('.form__status-text');
    var submitBtn = form.querySelector('button[type="submit"]');
    var successBox = document.getElementById('formular-danke');
    var fields = form.querySelectorAll('.input');
    var submitting = false;

    // Bei ungültigen Feldern bricht der Browser ab, ohne "submit" auszulösen.
    // Erst dieses Ereignis schaltet daher die Fehlerdarstellung frei.
    // "invalid" steigt nicht auf — deshalb in der Erfassungsphase lauschen.
    form.addEventListener('invalid', function () {
      form.classList.add('was-submitted');
    }, true);

    // Eigene Fehlertexte, live zurückgesetzt sobald korrigiert wird
    Array.prototype.forEach.call(fields, function (field) {
      var errorEl = field.parentNode.querySelector('.field__error');
      field.addEventListener('invalid', function () {
        applyValidationMessage(field);
        if (errorEl) errorEl.textContent = field.validationMessage;
      });
      // "change" zusätzlich zu "input": sonst kann eine gesetzte eigene
      // Fehlermeldung nach dem Ausfüllen per Autofill hängen bleiben.
      ['input', 'change'].forEach(function (evt) {
        field.addEventListener(evt, function () {
          field.setCustomValidity('');
          if (errorEl && field.validity.valid) errorEl.textContent = '';
        });
      });
    });

    function showError(message) {
      if (!statusBox || !statusText) return;
      statusText.textContent = message;
      statusBox.hidden = false;
    }

    function clearError() {
      if (statusBox) statusBox.hidden = true;
    }

    function setBusy(busy) {
      submitting = busy;
      if (!submitBtn) return;
      submitBtn.disabled = busy;
      submitBtn.textContent = busy ? 'Wird gesendet …' : 'Absenden';
    }

    // Rückfallweg ohne Versanddienst: Mailprogramm vorbereiten
    function sendViaMailto(data) {
      var lines = [
        'Name: ' + (data.get('name') || ''),
        'E-Mail: ' + (data.get('email') || ''),
        'Telefon: ' + (data.get('tel') || '—'),
        'Gewünschte Behandlung: ' + (data.get('behandlung') || '—'),
        '',
        'Nachricht:',
        data.get('nachricht') || '—'
      ].join('\n');
      window.location.href = 'mailto:' + PRAXIS_MAIL +
        '?subject=' + encodeURIComponent('Terminanfrage über die Website') +
        '&body=' + encodeURIComponent(lines);
    }

    function sendViaEndpoint(data) {
      return fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        if (response.ok) return true;
        return response.json().catch(function () { return null; }).then(function (body) {
          var detail = body && body.errors && body.errors.length ? body.errors[0].message : '';
          throw new Error(detail || 'Der Versand wurde abgelehnt (Status ' + response.status + ').');
        });
      });
    }

    form.addEventListener('submit', function (e) {
      form.classList.add('was-submitted');

      if (!form.checkValidity()) {
        e.preventDefault();
        var firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      e.preventDefault();
      if (submitting) return;          // Doppelversand verhindern
      clearError();

      var data = new FormData(form);

      if (!isConfigured) {
        sendViaMailto(data);
        return;
      }

      setBusy(true);
      sendViaEndpoint(data)
        .then(function () {
          form.hidden = true;
          if (successBox) {
            successBox.hidden = false;
            successBox.focus();
          }
        })
        .catch(function (err) {
          setBusy(false);
          showError(
            (err && err.message ? err.message : 'Die Verbindung ist fehlgeschlagen.') +
            ' Bitte versuchen Sie es erneut oder rufen Sie an: 077 440 33 07.'
          );
        });
    });

    // "Neue Anfrage" nach erfolgreichem Versand
    var resetBtn = document.getElementById('formular-neu');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        form.classList.remove('was-submitted');
        form.hidden = false;
        if (successBox) successBox.hidden = true;
        setBusy(false);
        clearError();
        form.querySelector('.input').focus();
      });
    }
  }

  /* ── Behandlung aus der URL vorauswählen ──────────────────────────── */
  // "Diesen Termin anfragen" verlinkt auf kontakt.html?behandlung=…
  function preselectTreatment() {
    var select = document.getElementById('behandlung');
    if (!select || !window.URLSearchParams) return;
    var wanted = new URLSearchParams(window.location.search).get('behandlung');
    if (!wanted) return;
    Array.prototype.forEach.call(select.options, function (option) {
      if (option.value === wanted) select.value = option.value;
    });
  }

  function init() {
    initMenu();
    initForm();
    preselectTreatment();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
