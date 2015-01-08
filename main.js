/**
 *
 * This is the main kiwi script.
 * 
 * It assumes that all of the rangy files have been declared before this file.
 *
 */

var highlighter;

window.onload = function() {
    rangy.init();
    
    highlighter = rangy.createHighlighter();
    
    highlighter.addClassApplier(rangy.createCssClassApplier("highlight", {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"],
        elementProperties: {
            href: "#",
            onclick: function() {
                var highlight = highlighter.getHighlightForElement(this);
                alert("Opening comment:" + highlight.id);
                return false;
            }
        }
    }));
};

window.onmouseup = function() {
    highlighter.highlightSelection("highlight");
}
