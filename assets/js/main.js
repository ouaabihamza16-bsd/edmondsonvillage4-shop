/* Edmondson Village 4 Pty Ltd: mobile menu, smooth scrolling, enquiry form and legal dialogs */
(function () {
  'use strict';

  /*
   * Enquiry form destination.
   * The form is not connected yet, so this stays empty and the form never sends anything.
   * When the company confirms an email address, enter it here: a valid submission will then
   * open a prefilled message in the visitor's own email app. At the same time, update the
   * contact details, the "Not yet connected" notice and the Privacy Policy in index.html.
   */
  var CONTACT_EMAIL = '';

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function prefersReducedMotion() {
    return !!(motionQuery && motionQuery.matches);
  }

  /* Current year in the footer */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* Mobile menu */
  var menuButton = document.getElementById('menu-button');
  var mobileMenu = document.getElementById('mobile-menu');

  function isMenuOpen() {
    return !!menuButton && menuButton.getAttribute('aria-expanded') === 'true';
  }

  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.hidden = !open;
    var openIcon = menuButton.querySelector('[data-icon="open"]');
    var closeIcon = menuButton.querySelector('[data-icon="close"]');
    if (openIcon) openIcon.classList.toggle('hidden', open);
    if (closeIcon) closeIcon.classList.toggle('hidden', !open);
  }

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', function () {
      setMenu(!isMenuOpen());
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isMenuOpen()) {
        setMenu(false);
        menuButton.focus();
      }
    });

    if (window.matchMedia) {
      var desktopQuery = window.matchMedia('(min-width: 1024px)');
      var closeOnDesktop = function (event) {
        if (event.matches) setMenu(false);
      };
      if (desktopQuery.addEventListener) {
        desktopQuery.addEventListener('change', closeOnDesktop);
      } else if (desktopQuery.addListener) {
        desktopQuery.addListener(closeOnDesktop);
      }
    }
  }

  /* Smooth scrolling for links within the page */
  document.addEventListener('click', function (event) {
    if (!event.target.closest) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute('href');
    if (!hash || hash.length < 2) return;
    var target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();
    if (isMenuOpen()) setMenu(false);

    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', hash);
    }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    try {
      target.focus({ preventScroll: true });
    } catch (err) {
      target.focus();
    }
  });

  /* Privacy Policy and Terms of Service dialogs */
  var lastTrigger = null;

  function restoreFocus() {
    if (lastTrigger && document.body.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function openDialog(dialog, trigger) {
    lastTrigger = trigger || null;
    if (isMenuOpen()) setMenu(false);
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    restoreFocus();
  }

  document.addEventListener('click', function (event) {
    if (!event.target.closest) return;
    var opener = event.target.closest('[data-open-dialog]');
    if (opener) {
      var dialog = document.getElementById(opener.getAttribute('data-open-dialog'));
      if (dialog) {
        event.preventDefault();
        openDialog(dialog, opener);
      }
      return;
    }
    var closer = event.target.closest('[data-close-dialog]');
    if (closer) {
      var parentDialog = closer.closest('dialog');
      if (parentDialog) closeDialog(parentDialog);
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (dialog) {
    /* Esc closes a modal dialog natively; this puts focus back on the button that opened it */
    dialog.addEventListener('close', function () {
      if (lastTrigger) restoreFocus();
    });
    /* A click on the dimmed backdrop closes the dialog */
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  /* Enquiry form: validation in the browser, and an honest result message */
  var form = document.getElementById('enquiry-form');
  if (!form) return;

  var statusEl = document.getElementById('form-status');
  var submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = false;

  var attempted = false;
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_PATTERN = /^\+?[0-9\s()-]{6,20}$/;

  var rules = {
    name: function (value) {
      return value ? '' : 'Please enter your name.';
    },
    email: function (value) {
      if (!value) return 'Please enter your email address.';
      return EMAIL_PATTERN.test(value) ? '' : 'Please enter a valid email address, including the @ and the domain.';
    },
    phone: function (value) {
      if (!value) return '';
      return PHONE_PATTERN.test(value) ? '' : 'Please enter a valid phone number, or leave this field blank.';
    },
    message: function (value) {
      if (!value) return 'Please enter your message.';
      return value.length >= 10 ? '' : 'Please add a little more detail (at least 10 characters).';
    }
  };

  function fieldValue(name) {
    var field = form.elements[name];
    return field ? field.value.trim() : '';
  }

  function showError(name, message) {
    var field = form.elements[name];
    var errorEl = document.getElementById(name + '-error');
    if (!field || !errorEl) return;
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      field.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function validateField(name) {
    var message = rules[name](fieldValue(name));
    showError(name, message);
    return !message;
  }

  function setStatus(type, message) {
    if (!statusEl) return;
    statusEl.className = 'form-status' + (type ? ' form-status--' + type : '');
    statusEl.textContent = message || '';
  }

  Object.keys(rules).forEach(function (name) {
    var field = form.elements[name];
    if (!field) return;
    field.addEventListener('blur', function () {
      if (attempted || field.value.trim()) validateField(name);
    });
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') validateField(name);
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    attempted = true;

    var firstInvalid = null;
    var errorCount = 0;
    Object.keys(rules).forEach(function (name) {
      if (!validateField(name)) {
        errorCount += 1;
        if (!firstInvalid) firstInvalid = form.elements[name];
      }
    });

    if (firstInvalid) {
      setStatus('error', errorCount === 1
        ? 'One field needs attention before this form can be checked.'
        : errorCount + ' fields need attention before this form can be checked.');
      firstInvalid.focus();
      return;
    }

    if (CONTACT_EMAIL) {
      var topic = fieldValue('topic');
      var phone = fieldValue('phone');
      var subject = 'Website enquiry' + (topic ? ': ' + topic : '');
      var body = 'Name: ' + fieldValue('name') +
        '\nEmail: ' + fieldValue('email') +
        (phone ? '\nPhone: ' + phone : '') +
        (topic ? '\nEnquiry type: ' + topic : '') +
        '\n\n' + fieldValue('message');
      window.location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      setStatus('success', 'Your email app has opened with your message. Press send to reach us.');
      return;
    }

    setStatus('notice', 'Your message has not been sent. This form is not connected yet, so nothing you typed has been sent or stored. Phone and email details will be added to this page once they are confirmed.');
  });
})();
