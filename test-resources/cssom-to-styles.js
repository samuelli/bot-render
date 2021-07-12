var cssStyles = '';
for (let i = 0; i < document.styleSheets.length; i++) {
    let style = null;
    let styleSheet = document.styleSheets[i];
    if (styleSheet.href == null && styleSheet.ownerNode.textContent == '') {
        style = styleSheet.rules;
    }
    for (let item in style) {
        if (style[item].cssText != undefined) {
            cssStyles += style[item].cssText;
        }
    }
}
var head = document.head || document.getElementsByTagName('head')[0];
var style = document.getElementById('styles-for-prerender');
if (style) {
    style.setAttribute(
        'iteration',
        parseInt(style.getAttribute('iteration')) + 1
    );
    while (style.firstChild) {
        style.removeChild(style.firstChild);
    }
} else {
    style = document.createElement('style');
    style.setAttribute('iteration', '1');
    head.appendChild(style);
    style.id = 'styles-for-prerender';
    style.type = 'text/css';
}
style.appendChild(document.createTextNode(cssStyles));