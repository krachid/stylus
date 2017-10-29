/* global usercss saveStyle getStyles */

'use strict';

// eslint-disable-next-line no-var
var usercssHelper = (() => {
  function buildMeta(style) {
    if (style.usercssData) {
      return Promise.resolve(style);
    }
    try {
      const {sourceCode} = style;
      // allow sourceCode to be normalized
      delete style.sourceCode;
      return Promise.resolve(Object.assign(usercss.buildMeta(sourceCode), style));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function buildCode(style) {
    return usercss.buildCode(style);
  }

  function wrapReject(pending) {
    return pending.then(result => ({status: 'success', result}))
      .catch(err => ({status: 'error', result: err.message || String(err)}));
  }

  // Parse the source and find the duplication
  // style: {sourceCode: string, checkDup: boolean}
  function build(request, noReject) {
    const pending = buildMeta(request)
      .then(style => Promise.all([buildCode(style), checkDup(style)]))
      .then(([style, dup]) => ({style, dup}));

    if (noReject) {
      return wrapReject(pending);
    }
    return pending;

    function checkDup(style) {
      const {checkDup} = style;
      delete style.checkDup;
      if (checkDup) {
        return findDup(style);
      }
    }
  }

  function save(style, noReject) {
    const pending = buildMeta(style)
      .then(assignVars)
      .then(buildCode)
      .then(saveStyle);

    if (noReject) {
      return wrapReject(pending);
    }

    return pending;

    function assignVars(style) {
      if (style.reason === 'config' && style.id) {
        return style;
      }
      return findDup(style)
        .then(dup => {
          if (dup) {
            style.id = dup.id;
            if (style.reason !== 'config') {
              // preserve style.vars during update
              usercss.assignVars(style, dup);
            }
          }
          return style;
        });
    }
  }

  function findDup(style) {
    if (style.id) {
      return getStyles({id: style.id}).then(s => s[0]);
    }
    return getStyles().then(styles =>
      styles.find(target => {
        if (!target.usercssData) {
          return false;
        }
        return target.usercssData.name === style.usercssData.name &&
          target.usercssData.namespace === style.usercssData.namespace;
      })
    );
  }

  function openInstallPage(tabId, request) {
    const url = '/install-usercss.html' +
      '?updateUrl=' + encodeURIComponent(request.updateUrl) +
      '&tabId=' + tabId;
    return wrapReject(openURL({url}));
  }

  return {build, save, findDup, openInstallPage};
})();
