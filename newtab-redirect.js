// Redirect to app.html so Chrome's "focus the omnibox" behaviour for new-tab
// overrides does not apply. window.location.replace keeps the history clean.
window.location.replace(chrome.runtime.getURL("app.html?x"));
