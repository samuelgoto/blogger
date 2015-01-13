(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory();
    } else {
      root.rangy = factory();
    }
  }
})(function() {
  var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";
  var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed", "commonAncestorContainer"];
  var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore", "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents", "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];
  var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];
  var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select", "setEndPoint", "getBoundingClientRect"];
  function isHostMethod(o, p) {
    var t = typeof o[p];
    return t == FUNCTION || !!(t == OBJECT && o[p]) || t == "unknown";
  }
  function isHostObject(o, p) {
    return!!(typeof o[p] == OBJECT && o[p]);
  }
  function isHostProperty(o, p) {
    return typeof o[p] != UNDEFINED;
  }
  function createMultiplePropertyTest(testFunc) {
    return function(o, props) {
      var i = props.length;
      while (i--) {
        if (!testFunc(o, props[i])) {
          return false;
        }
      }
      return true;
    };
  }
  var areHostMethods = createMultiplePropertyTest(isHostMethod);
  var areHostObjects = createMultiplePropertyTest(isHostObject);
  var areHostProperties = createMultiplePropertyTest(isHostProperty);
  function isTextRange(range) {
    return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
  }
  function getBody(doc) {
    return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
  }
  var modules = {};
  var isBrowser = typeof window != UNDEFINED && typeof document != UNDEFINED;
  var util = {isHostMethod:isHostMethod, isHostObject:isHostObject, isHostProperty:isHostProperty, areHostMethods:areHostMethods, areHostObjects:areHostObjects, areHostProperties:areHostProperties, isTextRange:isTextRange, getBody:getBody};
  var api = {version:"1.3.0-alpha.20140921", initialized:false, isBrowser:isBrowser, supported:true, util:util, features:{}, modules:modules, config:{alertOnFail:true, alertOnWarn:false, preferTextRange:false, autoInitialize:typeof rangyAutoInitialize == UNDEFINED ? true : rangyAutoInitialize}};
  function consoleLog(msg) {
    if (typeof console != UNDEFINED && isHostMethod(console, "log")) {
      console.log(msg);
    }
  }
  function alertOrLog(msg, shouldAlert) {
    if (isBrowser && shouldAlert) {
      alert(msg);
    } else {
      consoleLog(msg);
    }
  }
  function fail(reason) {
    api.initialized = true;
    api.supported = false;
    alertOrLog("Rangy is not supported in this environment. Reason: " + reason, api.config.alertOnFail);
  }
  api.fail = fail;
  function warn(msg) {
    alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
  }
  api.warn = warn;
  var extend;
  if ({}.hasOwnProperty) {
    util.extend = extend = function(obj, props, deep) {
      var o, p;
      for (var i in props) {
        if (props.hasOwnProperty(i)) {
          o = obj[i];
          p = props[i];
          if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
            extend(o, p, true);
          }
          obj[i] = p;
        }
      }
      if (props.hasOwnProperty("toString")) {
        obj.toString = props.toString;
      }
      return obj;
    };
    util.createOptions = function(optionsParam, defaults) {
      var options = {};
      extend(options, defaults);
      if (optionsParam) {
        extend(options, optionsParam);
      }
      return options;
    };
  } else {
    fail("hasOwnProperty not supported");
  }
  if (!isBrowser) {
    fail("Rangy can only run in a browser");
  }
  (function() {
    var toArray;
    if (isBrowser) {
      var el = document.createElement("div");
      el.appendChild(document.createElement("span"));
      var slice = [].slice;
      try {
        if (slice.call(el.childNodes, 0)[0].nodeType == 1) {
          toArray = function(arrayLike) {
            return slice.call(arrayLike, 0);
          };
        }
      } catch (e) {
      }
    }
    if (!toArray) {
      toArray = function(arrayLike) {
        var arr = [];
        for (var i = 0, len = arrayLike.length;i < len;++i) {
          arr[i] = arrayLike[i];
        }
        return arr;
      };
    }
    util.toArray = toArray;
  })();
  var addListener;
  if (isBrowser) {
    if (isHostMethod(document, "addEventListener")) {
      addListener = function(obj, eventType, listener) {
        obj.addEventListener(eventType, listener, false);
      };
    } else {
      if (isHostMethod(document, "attachEvent")) {
        addListener = function(obj, eventType, listener) {
          obj.attachEvent("on" + eventType, listener);
        };
      } else {
        fail("Document does not have required addEventListener or attachEvent method");
      }
    }
    util.addListener = addListener;
  }
  var initListeners = [];
  function getErrorDesc(ex) {
    return ex.message || ex.description || String(ex);
  }
  function init() {
    if (!isBrowser || api.initialized) {
      return;
    }
    var testRange;
    var implementsDomRange = false, implementsTextRange = false;
    if (isHostMethod(document, "createRange")) {
      testRange = document.createRange();
      if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
        implementsDomRange = true;
      }
    }
    var body = getBody(document);
    if (!body || body.nodeName.toLowerCase() != "body") {
      fail("No body element found");
      return;
    }
    if (body && isHostMethod(body, "createTextRange")) {
      testRange = body.createTextRange();
      if (isTextRange(testRange)) {
        implementsTextRange = true;
      }
    }
    if (!implementsDomRange && !implementsTextRange) {
      fail("Neither Range nor TextRange are available");
      return;
    }
    api.initialized = true;
    api.features = {implementsDomRange:implementsDomRange, implementsTextRange:implementsTextRange};
    var module, errorMessage;
    for (var moduleName in modules) {
      if ((module = modules[moduleName]) instanceof Module) {
        module.init(module, api);
      }
    }
    for (var i = 0, len = initListeners.length;i < len;++i) {
      try {
        initListeners[i](api);
      } catch (ex) {
        errorMessage = "Rangy init listener threw an exception. Continuing. Detail: " + getErrorDesc(ex);
        consoleLog(errorMessage);
      }
    }
  }
  api.init = init;
  api.addInitListener = function(listener) {
    if (api.initialized) {
      listener(api);
    } else {
      initListeners.push(listener);
    }
  };
  var shimListeners = [];
  api.addShimListener = function(listener) {
    shimListeners.push(listener);
  };
  function shim(win) {
    win = win || window;
    init();
    for (var i = 0, len = shimListeners.length;i < len;++i) {
      shimListeners[i](win);
    }
  }
  if (isBrowser) {
    api.shim = api.createMissingNativeApi = shim;
  }
  function Module(name, dependencies, initializer) {
    this.name = name;
    this.dependencies = dependencies;
    this.initialized = false;
    this.supported = false;
    this.initializer = initializer;
  }
  Module.prototype = {init:function() {
    var requiredModuleNames = this.dependencies || [];
    for (var i = 0, len = requiredModuleNames.length, requiredModule, moduleName;i < len;++i) {
      moduleName = requiredModuleNames[i];
      requiredModule = modules[moduleName];
      if (!requiredModule || !(requiredModule instanceof Module)) {
        throw new Error("required module '" + moduleName + "' not found");
      }
      requiredModule.init();
      if (!requiredModule.supported) {
        throw new Error("required module '" + moduleName + "' not supported");
      }
    }
    this.initializer(this);
  }, fail:function(reason) {
    this.initialized = true;
    this.supported = false;
    throw new Error("Module '" + this.name + "' failed to load: " + reason);
  }, warn:function(msg) {
    api.warn("Module " + this.name + ": " + msg);
  }, deprecationNotice:function(deprecated, replacement) {
    api.warn("DEPRECATED: " + deprecated + " in module " + this.name + "is deprecated. Please use " + replacement + " instead");
  }, createError:function(msg) {
    return new Error("Error in Rangy " + this.name + " module: " + msg);
  }};
  function createModule(name, dependencies, initFunc) {
    var newModule = new Module(name, dependencies, function(module) {
      if (!module.initialized) {
        module.initialized = true;
        try {
          initFunc(api, module);
          module.supported = true;
        } catch (ex) {
          var errorMessage = "Module '" + name + "' failed to load: " + getErrorDesc(ex);
          consoleLog(errorMessage);
          if (ex.stack) {
            consoleLog(ex.stack);
          }
        }
      }
    });
    modules[name] = newModule;
    return newModule;
  }
  api.createModule = function(name) {
    var initFunc, dependencies;
    if (arguments.length == 2) {
      initFunc = arguments[1];
      dependencies = [];
    } else {
      initFunc = arguments[2];
      dependencies = arguments[1];
    }
    var module = createModule(name, dependencies, initFunc);
    if (api.initialized && api.supported) {
      module.init();
    }
  };
  api.createCoreModule = function(name, dependencies, initFunc) {
    createModule(name, dependencies, initFunc);
  };
  function RangePrototype() {
  }
  api.RangePrototype = RangePrototype;
  api.rangePrototype = new RangePrototype;
  function SelectionPrototype() {
  }
  api.selectionPrototype = new SelectionPrototype;
  api.createCoreModule("DomUtil", [], function(api, module) {
    var UNDEF = "undefined";
    var util = api.util;
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
      module.fail("document missing a Node creation method");
    }
    if (!util.isHostMethod(document, "getElementsByTagName")) {
      module.fail("document missing getElementsByTagName method");
    }
    var el = document.createElement("div");
    if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] || !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
      module.fail("Incomplete Element implementation");
    }
    if (!util.isHostProperty(el, "innerHTML")) {
      module.fail("Element is missing innerHTML property");
    }
    var textNode = document.createTextNode("test");
    if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] || !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) || !util.areHostProperties(textNode, ["data"]))) {
      module.fail("Incomplete Text Node implementation");
    }
    var arrayContains = function(arr, val) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === val) {
          return true;
        }
      }
      return false;
    };
    function isHtmlNamespace(node) {
      var ns;
      return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }
    function parentElement(node) {
      var parent = node.parentNode;
      return parent.nodeType == 1 ? parent : null;
    }
    function getNodeIndex(node) {
      var i = 0;
      while (node = node.previousSibling) {
        ++i;
      }
      return i;
    }
    function getNodeLength(node) {
      switch(node.nodeType) {
        case 7:
        ;
        case 10:
          return 0;
        case 3:
        ;
        case 8:
          return node.length;
        default:
          return node.childNodes.length;
      }
    }
    function getCommonAncestor(node1, node2) {
      var ancestors = [], n;
      for (n = node1;n;n = n.parentNode) {
        ancestors.push(n);
      }
      for (n = node2;n;n = n.parentNode) {
        if (arrayContains(ancestors, n)) {
          return n;
        }
      }
      return null;
    }
    function isAncestorOf(ancestor, descendant, selfIsAncestor) {
      var n = selfIsAncestor ? descendant : descendant.parentNode;
      while (n) {
        if (n === ancestor) {
          return true;
        } else {
          n = n.parentNode;
        }
      }
      return false;
    }
    function isOrIsAncestorOf(ancestor, descendant) {
      return isAncestorOf(ancestor, descendant, true);
    }
    function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
      var p, n = selfIsAncestor ? node : node.parentNode;
      while (n) {
        p = n.parentNode;
        if (p === ancestor) {
          return n;
        }
        n = p;
      }
      return null;
    }
    function isCharacterDataNode(node) {
      var t = node.nodeType;
      return t == 3 || t == 4 || t == 8;
    }
    function isTextOrCommentNode(node) {
      if (!node) {
        return false;
      }
      var t = node.nodeType;
      return t == 3 || t == 8;
    }
    function insertAfter(node, precedingNode) {
      var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
      if (nextNode) {
        parent.insertBefore(node, nextNode);
      } else {
        parent.appendChild(node);
      }
      return node;
    }
    function splitDataNode(node, index, positionsToPreserve) {
      var newNode = node.cloneNode(false);
      newNode.deleteData(0, index);
      node.deleteData(index, node.length - index);
      insertAfter(newNode, node);
      if (positionsToPreserve) {
        for (var i = 0, position;position = positionsToPreserve[i++];) {
          if (position.node == node && position.offset > index) {
            position.node = newNode;
            position.offset -= index;
          } else {
            if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
              ++position.offset;
            }
          }
        }
      }
      return newNode;
    }
    function getDocument(node) {
      if (node.nodeType == 9) {
        return node;
      } else {
        if (typeof node.ownerDocument != UNDEF) {
          return node.ownerDocument;
        } else {
          if (typeof node.document != UNDEF) {
            return node.document;
          } else {
            if (node.parentNode) {
              return getDocument(node.parentNode);
            } else {
              throw module.createError("getDocument: no document found for node");
            }
          }
        }
      }
    }
    function getWindow(node) {
      var doc = getDocument(node);
      if (typeof doc.defaultView != UNDEF) {
        return doc.defaultView;
      } else {
        if (typeof doc.parentWindow != UNDEF) {
          return doc.parentWindow;
        } else {
          throw module.createError("Cannot get a window object for node");
        }
      }
    }
    function getIframeDocument(iframeEl) {
      if (typeof iframeEl.contentDocument != UNDEF) {
        return iframeEl.contentDocument;
      } else {
        if (typeof iframeEl.contentWindow != UNDEF) {
          return iframeEl.contentWindow.document;
        } else {
          throw module.createError("getIframeDocument: No Document object found for iframe element");
        }
      }
    }
    function getIframeWindow(iframeEl) {
      if (typeof iframeEl.contentWindow != UNDEF) {
        return iframeEl.contentWindow;
      } else {
        if (typeof iframeEl.contentDocument != UNDEF) {
          return iframeEl.contentDocument.defaultView;
        } else {
          throw module.createError("getIframeWindow: No Window object found for iframe element");
        }
      }
    }
    function isWindow(obj) {
      return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
    }
    function getContentDocument(obj, module, methodName) {
      var doc;
      if (!obj) {
        doc = document;
      } else {
        if (util.isHostProperty(obj, "nodeType")) {
          doc = obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe" ? getIframeDocument(obj) : getDocument(obj);
        } else {
          if (isWindow(obj)) {
            doc = obj.document;
          }
        }
      }
      if (!doc) {
        throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
      }
      return doc;
    }
    function getRootContainer(node) {
      var parent;
      while (parent = node.parentNode) {
        node = parent;
      }
      return node;
    }
    function comparePoints(nodeA, offsetA, nodeB, offsetB) {
      var nodeC, root, childA, childB, n;
      if (nodeA == nodeB) {
        return offsetA === offsetB ? 0 : offsetA < offsetB ? -1 : 1;
      } else {
        if (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) {
          return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else {
          if (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) {
            return getNodeIndex(nodeC) < offsetB ? -1 : 1;
          } else {
            root = getCommonAncestor(nodeA, nodeB);
            if (!root) {
              throw new Error("comparePoints error: nodes have no common ancestor");
            }
            childA = nodeA === root ? root : getClosestAncestorIn(nodeA, root, true);
            childB = nodeB === root ? root : getClosestAncestorIn(nodeB, root, true);
            if (childA === childB) {
              throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
            } else {
              n = root.firstChild;
              while (n) {
                if (n === childA) {
                  return-1;
                } else {
                  if (n === childB) {
                    return 1;
                  }
                }
                n = n.nextSibling;
              }
            }
          }
        }
      }
    }
    var crashyTextNodes = false;
    function isBrokenNode(node) {
      var n;
      try {
        n = node.parentNode;
        return false;
      } catch (e) {
        return true;
      }
    }
    (function() {
      var el = document.createElement("b");
      el.innerHTML = "1";
      var textNode = el.firstChild;
      el.innerHTML = "<br>";
      crashyTextNodes = isBrokenNode(textNode);
      api.features.crashyTextNodes = crashyTextNodes;
    })();
    function inspectNode(node) {
      if (!node) {
        return "[No node]";
      }
      if (crashyTextNodes && isBrokenNode(node)) {
        return "[Broken node]";
      }
      if (isCharacterDataNode(node)) {
        return'"' + node.data + '"';
      }
      if (node.nodeType == 1) {
        var idAttr = node.id ? ' id="' + node.id + '"' : "";
        return "<" + node.nodeName + idAttr + ">[index:" + getNodeIndex(node) + ",length:" + node.childNodes.length + "][" + (node.innerHTML || "[innerHTML not supported]").slice(0, 25) + "]";
      }
      return node.nodeName;
    }
    function fragmentFromNodeChildren(node) {
      var fragment = getDocument(node).createDocumentFragment(), child;
      while (child = node.firstChild) {
        fragment.appendChild(child);
      }
      return fragment;
    }
    var getComputedStyleProperty;
    if (typeof window.getComputedStyle != UNDEF) {
      getComputedStyleProperty = function(el, propName) {
        return getWindow(el).getComputedStyle(el, null)[propName];
      };
    } else {
      if (typeof document.documentElement.currentStyle != UNDEF) {
        getComputedStyleProperty = function(el, propName) {
          return el.currentStyle[propName];
        };
      } else {
        module.fail("No means of obtaining computed style properties found");
      }
    }
    function NodeIterator(root) {
      this.root = root;
      this._next = root;
    }
    NodeIterator.prototype = {_current:null, hasNext:function() {
      return!!this._next;
    }, next:function() {
      var n = this._current = this._next;
      var child, next;
      if (this._current) {
        child = n.firstChild;
        if (child) {
          this._next = child;
        } else {
          next = null;
          while (n !== this.root && !(next = n.nextSibling)) {
            n = n.parentNode;
          }
          this._next = next;
        }
      }
      return this._current;
    }, detach:function() {
      this._current = this._next = this.root = null;
    }};
    function createIterator(root) {
      return new NodeIterator(root);
    }
    function DomPosition(node, offset) {
      this.node = node;
      this.offset = offset;
    }
    DomPosition.prototype = {equals:function(pos) {
      return!!pos && this.node === pos.node && this.offset == pos.offset;
    }, inspect:function() {
      return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
    }, toString:function() {
      return this.inspect();
    }};
    function DOMException(codeName) {
      this.code = this[codeName];
      this.codeName = codeName;
      this.message = "DOMException: " + this.codeName;
    }
    DOMException.prototype = {INDEX_SIZE_ERR:1, HIERARCHY_REQUEST_ERR:3, WRONG_DOCUMENT_ERR:4, NO_MODIFICATION_ALLOWED_ERR:7, NOT_FOUND_ERR:8, NOT_SUPPORTED_ERR:9, INVALID_STATE_ERR:11, INVALID_NODE_TYPE_ERR:24};
    DOMException.prototype.toString = function() {
      return this.message;
    };
    api.dom = {arrayContains:arrayContains, isHtmlNamespace:isHtmlNamespace, parentElement:parentElement, getNodeIndex:getNodeIndex, getNodeLength:getNodeLength, getCommonAncestor:getCommonAncestor, isAncestorOf:isAncestorOf, isOrIsAncestorOf:isOrIsAncestorOf, getClosestAncestorIn:getClosestAncestorIn, isCharacterDataNode:isCharacterDataNode, isTextOrCommentNode:isTextOrCommentNode, insertAfter:insertAfter, splitDataNode:splitDataNode, getDocument:getDocument, getWindow:getWindow, getIframeWindow:getIframeWindow, 
    getIframeDocument:getIframeDocument, getBody:util.getBody, isWindow:isWindow, getContentDocument:getContentDocument, getRootContainer:getRootContainer, comparePoints:comparePoints, isBrokenNode:isBrokenNode, inspectNode:inspectNode, getComputedStyleProperty:getComputedStyleProperty, fragmentFromNodeChildren:fragmentFromNodeChildren, createIterator:createIterator, DomPosition:DomPosition};
    api.DOMException = DOMException;
  });
  api.createCoreModule("DomRange", ["DomUtil"], function(api, module) {
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DOMException = api.DOMException;
    var isCharacterDataNode = dom.isCharacterDataNode;
    var getNodeIndex = dom.getNodeIndex;
    var isOrIsAncestorOf = dom.isOrIsAncestorOf;
    var getDocument = dom.getDocument;
    var comparePoints = dom.comparePoints;
    var splitDataNode = dom.splitDataNode;
    var getClosestAncestorIn = dom.getClosestAncestorIn;
    var getNodeLength = dom.getNodeLength;
    var arrayContains = dom.arrayContains;
    var getRootContainer = dom.getRootContainer;
    var crashyTextNodes = api.features.crashyTextNodes;
    function isNonTextPartiallySelected(node, range) {
      return node.nodeType != 3 && (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
    }
    function getRangeDocument(range) {
      return range.document || getDocument(range.startContainer);
    }
    function getBoundaryBeforeNode(node) {
      return new DomPosition(node.parentNode, getNodeIndex(node));
    }
    function getBoundaryAfterNode(node) {
      return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
    }
    function insertNodeAtPosition(node, n, o) {
      var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
      if (isCharacterDataNode(n)) {
        if (o == n.length) {
          dom.insertAfter(node, n);
        } else {
          n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
        }
      } else {
        if (o >= n.childNodes.length) {
          n.appendChild(node);
        } else {
          n.insertBefore(node, n.childNodes[o]);
        }
      }
      return firstNodeInserted;
    }
    function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
      assertRangeValid(rangeA);
      assertRangeValid(rangeB);
      if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
        throw new DOMException("WRONG_DOCUMENT_ERR");
      }
      var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset), endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);
      return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }
    function cloneSubtree(iterator) {
      var partiallySelected;
      for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator;node = iterator.next();) {
        partiallySelected = iterator.isPartiallySelectedSubtree();
        node = node.cloneNode(!partiallySelected);
        if (partiallySelected) {
          subIterator = iterator.getSubtreeIterator();
          node.appendChild(cloneSubtree(subIterator));
          subIterator.detach();
        }
        if (node.nodeType == 10) {
          throw new DOMException("HIERARCHY_REQUEST_ERR");
        }
        frag.appendChild(node);
      }
      return frag;
    }
    function iterateSubtree(rangeIterator, func, iteratorState) {
      var it, n;
      iteratorState = iteratorState || {stop:false};
      for (var node, subRangeIterator;node = rangeIterator.next();) {
        if (rangeIterator.isPartiallySelectedSubtree()) {
          if (func(node) === false) {
            iteratorState.stop = true;
            return;
          } else {
            subRangeIterator = rangeIterator.getSubtreeIterator();
            iterateSubtree(subRangeIterator, func, iteratorState);
            subRangeIterator.detach();
            if (iteratorState.stop) {
              return;
            }
          }
        } else {
          it = dom.createIterator(node);
          while (n = it.next()) {
            if (func(n) === false) {
              iteratorState.stop = true;
              return;
            }
          }
        }
      }
    }
    function deleteSubtree(iterator) {
      var subIterator;
      while (iterator.next()) {
        if (iterator.isPartiallySelectedSubtree()) {
          subIterator = iterator.getSubtreeIterator();
          deleteSubtree(subIterator);
          subIterator.detach();
        } else {
          iterator.remove();
        }
      }
    }
    function extractSubtree(iterator) {
      for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator;node = iterator.next();) {
        if (iterator.isPartiallySelectedSubtree()) {
          node = node.cloneNode(false);
          subIterator = iterator.getSubtreeIterator();
          node.appendChild(extractSubtree(subIterator));
          subIterator.detach();
        } else {
          iterator.remove();
        }
        if (node.nodeType == 10) {
          throw new DOMException("HIERARCHY_REQUEST_ERR");
        }
        frag.appendChild(node);
      }
      return frag;
    }
    function getNodesInRange(range, nodeTypes, filter) {
      var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
      var filterExists = !!filter;
      if (filterNodeTypes) {
        regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
      }
      var nodes = [];
      iterateSubtree(new RangeIterator(range, false), function(node) {
        if (filterNodeTypes && !regex.test(node.nodeType)) {
          return;
        }
        if (filterExists && !filter(node)) {
          return;
        }
        var sc = range.startContainer;
        if (node == sc && isCharacterDataNode(sc) && range.startOffset == sc.length) {
          return;
        }
        var ec = range.endContainer;
        if (node == ec && isCharacterDataNode(ec) && range.endOffset == 0) {
          return;
        }
        nodes.push(node);
      });
      return nodes;
    }
    function inspect(range) {
      var name = typeof range.getName == "undefined" ? "Range" : range.getName();
      return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " + dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }
    function RangeIterator(range, clonePartiallySelectedTextNodes) {
      this.range = range;
      this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;
      if (!range.collapsed) {
        this.sc = range.startContainer;
        this.so = range.startOffset;
        this.ec = range.endContainer;
        this.eo = range.endOffset;
        var root = range.commonAncestorContainer;
        if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
          this.isSingleCharacterDataNode = true;
          this._first = this._last = this._next = this.sc;
        } else {
          this._first = this._next = this.sc === root && !isCharacterDataNode(this.sc) ? this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
          this._last = this.ec === root && !isCharacterDataNode(this.ec) ? this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
        }
      }
    }
    RangeIterator.prototype = {_current:null, _next:null, _first:null, _last:null, isSingleCharacterDataNode:false, reset:function() {
      this._current = null;
      this._next = this._first;
    }, hasNext:function() {
      return!!this._next;
    }, next:function() {
      var current = this._current = this._next;
      if (current) {
        this._next = current !== this._last ? current.nextSibling : null;
        if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
          if (current === this.ec) {
            (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
          }
          if (this._current === this.sc) {
            (current = current.cloneNode(true)).deleteData(0, this.so);
          }
        }
      }
      return current;
    }, remove:function() {
      var current = this._current, start, end;
      if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
        start = current === this.sc ? this.so : 0;
        end = current === this.ec ? this.eo : current.length;
        if (start != end) {
          current.deleteData(start, end - start);
        }
      } else {
        if (current.parentNode) {
          current.parentNode.removeChild(current);
        } else {
        }
      }
    }, isPartiallySelectedSubtree:function() {
      var current = this._current;
      return isNonTextPartiallySelected(current, this.range);
    }, getSubtreeIterator:function() {
      var subRange;
      if (this.isSingleCharacterDataNode) {
        subRange = this.range.cloneRange();
        subRange.collapse(false);
      } else {
        subRange = new Range(getRangeDocument(this.range));
        var current = this._current;
        var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);
        if (isOrIsAncestorOf(current, this.sc)) {
          startContainer = this.sc;
          startOffset = this.so;
        }
        if (isOrIsAncestorOf(current, this.ec)) {
          endContainer = this.ec;
          endOffset = this.eo;
        }
        updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
      }
      return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
    }, detach:function() {
      this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
    }};
    var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
    var rootContainerNodeTypes = [2, 9, 11];
    var readonlyNodeTypes = [5, 6, 10, 12];
    var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
    var surroundNodeTypes = [1, 3, 4, 5, 7, 8];
    function createAncestorFinder(nodeTypes) {
      return function(node, selfIsAncestor) {
        var t, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
          t = n.nodeType;
          if (arrayContains(nodeTypes, t)) {
            return n;
          }
          n = n.parentNode;
        }
        return null;
      };
    }
    var getDocumentOrFragmentContainer = createAncestorFinder([9, 11]);
    var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
    var getDocTypeNotationEntityAncestor = createAncestorFinder([6, 10, 12]);
    function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
      if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
        throw new DOMException("INVALID_NODE_TYPE_ERR");
      }
    }
    function assertValidNodeType(node, invalidTypes) {
      if (!arrayContains(invalidTypes, node.nodeType)) {
        throw new DOMException("INVALID_NODE_TYPE_ERR");
      }
    }
    function assertValidOffset(node, offset) {
      if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
        throw new DOMException("INDEX_SIZE_ERR");
      }
    }
    function assertSameDocumentOrFragment(node1, node2) {
      if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
        throw new DOMException("WRONG_DOCUMENT_ERR");
      }
    }
    function assertNodeNotReadOnly(node) {
      if (getReadonlyAncestor(node, true)) {
        throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
      }
    }
    function assertNode(node, codeName) {
      if (!node) {
        throw new DOMException(codeName);
      }
    }
    function isOrphan(node) {
      return crashyTextNodes && dom.isBrokenNode(node) || !arrayContains(rootContainerNodeTypes, node.nodeType) && !getDocumentOrFragmentContainer(node, true);
    }
    function isValidOffset(node, offset) {
      return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }
    function isRangeValid(range) {
      return!!range.startContainer && !!range.endContainer && !isOrphan(range.startContainer) && !isOrphan(range.endContainer) && isValidOffset(range.startContainer, range.startOffset) && isValidOffset(range.endContainer, range.endOffset);
    }
    function assertRangeValid(range) {
      if (!isRangeValid(range)) {
        throw new Error("Range error: Range is no longer valid after DOM mutation (" + range.inspect() + ")");
      }
    }
    var styleEl = document.createElement("style");
    var htmlParsingConforms = false;
    try {
      styleEl.innerHTML = "<b>x</b>";
      htmlParsingConforms = styleEl.firstChild.nodeType == 3;
    } catch (e) {
    }
    api.features.htmlParsingConforms = htmlParsingConforms;
    var createContextualFragment = htmlParsingConforms ? function(fragmentStr) {
      var node = this.startContainer;
      var doc = getDocument(node);
      if (!node) {
        throw new DOMException("INVALID_STATE_ERR");
      }
      var el = null;
      if (node.nodeType == 1) {
        el = node;
      } else {
        if (isCharacterDataNode(node)) {
          el = dom.parentElement(node);
        }
      }
      if (el === null || el.nodeName == "HTML" && dom.isHtmlNamespace(getDocument(el).documentElement) && dom.isHtmlNamespace(el)) {
        el = doc.createElement("body");
      } else {
        el = el.cloneNode(false);
      }
      el.innerHTML = fragmentStr;
      return dom.fragmentFromNodeChildren(el);
    } : function(fragmentStr) {
      var doc = getRangeDocument(this);
      var el = doc.createElement("body");
      el.innerHTML = fragmentStr;
      return dom.fragmentFromNodeChildren(el);
    };
    function splitRangeBoundaries(range, positionsToPreserve) {
      assertRangeValid(range);
      var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
      var startEndSame = sc === ec;
      if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
        splitDataNode(ec, eo, positionsToPreserve);
      }
      if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
        sc = splitDataNode(sc, so, positionsToPreserve);
        if (startEndSame) {
          eo -= so;
          ec = sc;
        } else {
          if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
            eo++;
          }
        }
        so = 0;
      }
      range.setStartAndEnd(sc, so, ec, eo);
    }
    function rangeToHtml(range) {
      assertRangeValid(range);
      var container = range.commonAncestorContainer.parentNode.cloneNode(false);
      container.appendChild(range.cloneContents());
      return container.innerHTML;
    }
    var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed", "commonAncestorContainer"];
    var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
    var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;
    util.extend(api.rangePrototype, {compareBoundaryPoints:function(how, range) {
      assertRangeValid(this);
      assertSameDocumentOrFragment(this.startContainer, range.startContainer);
      var nodeA, offsetA, nodeB, offsetB;
      var prefixA = how == e2s || how == s2s ? "start" : "end";
      var prefixB = how == s2e || how == s2s ? "start" : "end";
      nodeA = this[prefixA + "Container"];
      offsetA = this[prefixA + "Offset"];
      nodeB = range[prefixB + "Container"];
      offsetB = range[prefixB + "Offset"];
      return comparePoints(nodeA, offsetA, nodeB, offsetB);
    }, insertNode:function(node) {
      assertRangeValid(this);
      assertValidNodeType(node, insertableNodeTypes);
      assertNodeNotReadOnly(this.startContainer);
      if (isOrIsAncestorOf(node, this.startContainer)) {
        throw new DOMException("HIERARCHY_REQUEST_ERR");
      }
      var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
      this.setStartBefore(firstNodeInserted);
    }, cloneContents:function() {
      assertRangeValid(this);
      var clone, frag;
      if (this.collapsed) {
        return getRangeDocument(this).createDocumentFragment();
      } else {
        if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
          clone = this.startContainer.cloneNode(true);
          clone.data = clone.data.slice(this.startOffset, this.endOffset);
          frag = getRangeDocument(this).createDocumentFragment();
          frag.appendChild(clone);
          return frag;
        } else {
          var iterator = new RangeIterator(this, true);
          clone = cloneSubtree(iterator);
          iterator.detach();
        }
        return clone;
      }
    }, canSurroundContents:function() {
      assertRangeValid(this);
      assertNodeNotReadOnly(this.startContainer);
      assertNodeNotReadOnly(this.endContainer);
      var iterator = new RangeIterator(this, true);
      var boundariesInvalid = iterator._first && isNonTextPartiallySelected(iterator._first, this) || iterator._last && isNonTextPartiallySelected(iterator._last, this);
      iterator.detach();
      return!boundariesInvalid;
    }, surroundContents:function(node) {
      assertValidNodeType(node, surroundNodeTypes);
      if (!this.canSurroundContents()) {
        throw new DOMException("INVALID_STATE_ERR");
      }
      var content = this.extractContents();
      if (node.hasChildNodes()) {
        while (node.lastChild) {
          node.removeChild(node.lastChild);
        }
      }
      insertNodeAtPosition(node, this.startContainer, this.startOffset);
      node.appendChild(content);
      this.selectNode(node);
    }, cloneRange:function() {
      assertRangeValid(this);
      var range = new Range(getRangeDocument(this));
      var i = rangeProperties.length, prop;
      while (i--) {
        prop = rangeProperties[i];
        range[prop] = this[prop];
      }
      return range;
    }, toString:function() {
      assertRangeValid(this);
      var sc = this.startContainer;
      if (sc === this.endContainer && isCharacterDataNode(sc)) {
        return sc.nodeType == 3 || sc.nodeType == 4 ? sc.data.slice(this.startOffset, this.endOffset) : "";
      } else {
        var textParts = [], iterator = new RangeIterator(this, true);
        iterateSubtree(iterator, function(node) {
          if (node.nodeType == 3 || node.nodeType == 4) {
            textParts.push(node.data);
          }
        });
        iterator.detach();
        return textParts.join("");
      }
    }, compareNode:function(node) {
      assertRangeValid(this);
      var parent = node.parentNode;
      var nodeIndex = getNodeIndex(node);
      if (!parent) {
        throw new DOMException("NOT_FOUND_ERR");
      }
      var startComparison = this.comparePoint(parent, nodeIndex), endComparison = this.comparePoint(parent, nodeIndex + 1);
      if (startComparison < 0) {
        return endComparison > 0 ? n_b_a : n_b;
      } else {
        return endComparison > 0 ? n_a : n_i;
      }
    }, comparePoint:function(node, offset) {
      assertRangeValid(this);
      assertNode(node, "HIERARCHY_REQUEST_ERR");
      assertSameDocumentOrFragment(node, this.startContainer);
      if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
        return-1;
      } else {
        if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
          return 1;
        }
      }
      return 0;
    }, createContextualFragment:createContextualFragment, toHtml:function() {
      return rangeToHtml(this);
    }, intersectsNode:function(node, touchingIsIntersecting) {
      assertRangeValid(this);
      assertNode(node, "NOT_FOUND_ERR");
      if (getDocument(node) !== getRangeDocument(this)) {
        return false;
      }
      var parent = node.parentNode, offset = getNodeIndex(node);
      assertNode(parent, "NOT_FOUND_ERR");
      var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset), endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);
      return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }, isPointInRange:function(node, offset) {
      assertRangeValid(this);
      assertNode(node, "HIERARCHY_REQUEST_ERR");
      assertSameDocumentOrFragment(node, this.startContainer);
      return comparePoints(node, offset, this.startContainer, this.startOffset) >= 0 && comparePoints(node, offset, this.endContainer, this.endOffset) <= 0;
    }, intersectsRange:function(range) {
      return rangesIntersect(this, range, false);
    }, intersectsOrTouchesRange:function(range) {
      return rangesIntersect(this, range, true);
    }, intersection:function(range) {
      if (this.intersectsRange(range)) {
        var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset), endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);
        var intersectionRange = this.cloneRange();
        if (startComparison == -1) {
          intersectionRange.setStart(range.startContainer, range.startOffset);
        }
        if (endComparison == 1) {
          intersectionRange.setEnd(range.endContainer, range.endOffset);
        }
        return intersectionRange;
      }
      return null;
    }, union:function(range) {
      if (this.intersectsOrTouchesRange(range)) {
        var unionRange = this.cloneRange();
        if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
          unionRange.setStart(range.startContainer, range.startOffset);
        }
        if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
          unionRange.setEnd(range.endContainer, range.endOffset);
        }
        return unionRange;
      } else {
        throw new DOMException("Ranges do not intersect");
      }
    }, containsNode:function(node, allowPartial) {
      if (allowPartial) {
        return this.intersectsNode(node, false);
      } else {
        return this.compareNode(node) == n_i;
      }
    }, containsNodeContents:function(node) {
      return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
    }, containsRange:function(range) {
      var intersection = this.intersection(range);
      return intersection !== null && range.equals(intersection);
    }, containsNodeText:function(node) {
      var nodeRange = this.cloneRange();
      nodeRange.selectNode(node);
      var textNodes = nodeRange.getNodes([3]);
      if (textNodes.length > 0) {
        nodeRange.setStart(textNodes[0], 0);
        var lastTextNode = textNodes.pop();
        nodeRange.setEnd(lastTextNode, lastTextNode.length);
        return this.containsRange(nodeRange);
      } else {
        return this.containsNodeContents(node);
      }
    }, getNodes:function(nodeTypes, filter) {
      assertRangeValid(this);
      return getNodesInRange(this, nodeTypes, filter);
    }, getDocument:function() {
      return getRangeDocument(this);
    }, collapseBefore:function(node) {
      this.setEndBefore(node);
      this.collapse(false);
    }, collapseAfter:function(node) {
      this.setStartAfter(node);
      this.collapse(true);
    }, getBookmark:function(containerNode) {
      var doc = getRangeDocument(this);
      var preSelectionRange = api.createRange(doc);
      containerNode = containerNode || dom.getBody(doc);
      preSelectionRange.selectNodeContents(containerNode);
      var range = this.intersection(preSelectionRange);
      var start = 0, end = 0;
      if (range) {
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        start = preSelectionRange.toString().length;
        end = start + range.toString().length;
      }
      return{start:start, end:end, containerNode:containerNode};
    }, moveToBookmark:function(bookmark) {
      var containerNode = bookmark.containerNode;
      var charIndex = 0;
      this.setStart(containerNode, 0);
      this.collapse(true);
      var nodeStack = [containerNode], node, foundStart = false, stop = false;
      var nextCharIndex, i, childNodes;
      while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType == 3) {
          nextCharIndex = charIndex + node.length;
          if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
            this.setStart(node, bookmark.start - charIndex);
            foundStart = true;
          }
          if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
            this.setEnd(node, bookmark.end - charIndex);
            stop = true;
          }
          charIndex = nextCharIndex;
        } else {
          childNodes = node.childNodes;
          i = childNodes.length;
          while (i--) {
            nodeStack.push(childNodes[i]);
          }
        }
      }
    }, getName:function() {
      return "DomRange";
    }, equals:function(range) {
      return Range.rangesEqual(this, range);
    }, isValid:function() {
      return isRangeValid(this);
    }, inspect:function() {
      return inspect(this);
    }, detach:function() {
    }});
    function copyComparisonConstantsToObject(obj) {
      obj.START_TO_START = s2s;
      obj.START_TO_END = s2e;
      obj.END_TO_END = e2e;
      obj.END_TO_START = e2s;
      obj.NODE_BEFORE = n_b;
      obj.NODE_AFTER = n_a;
      obj.NODE_BEFORE_AND_AFTER = n_b_a;
      obj.NODE_INSIDE = n_i;
    }
    function copyComparisonConstants(constructor) {
      copyComparisonConstantsToObject(constructor);
      copyComparisonConstantsToObject(constructor.prototype);
    }
    function createRangeContentRemover(remover, boundaryUpdater) {
      return function() {
        assertRangeValid(this);
        var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;
        var iterator = new RangeIterator(this, true);
        var node, boundary;
        if (sc !== root) {
          node = getClosestAncestorIn(sc, root, true);
          boundary = getBoundaryAfterNode(node);
          sc = boundary.node;
          so = boundary.offset;
        }
        iterateSubtree(iterator, assertNodeNotReadOnly);
        iterator.reset();
        var returnValue = remover(iterator);
        iterator.detach();
        boundaryUpdater(this, sc, so, sc, so);
        return returnValue;
      };
    }
    function createPrototypeRange(constructor, boundaryUpdater) {
      function createBeforeAfterNodeSetter(isBefore, isStart) {
        return function(node) {
          assertValidNodeType(node, beforeAfterNodeTypes);
          assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);
          var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
          (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
        };
      }
      function setRangeStart(range, node, offset) {
        var ec = range.endContainer, eo = range.endOffset;
        if (node !== range.startContainer || offset !== range.startOffset) {
          if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
            ec = node;
            eo = offset;
          }
          boundaryUpdater(range, node, offset, ec, eo);
        }
      }
      function setRangeEnd(range, node, offset) {
        var sc = range.startContainer, so = range.startOffset;
        if (node !== range.endContainer || offset !== range.endOffset) {
          if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
            sc = node;
            so = offset;
          }
          boundaryUpdater(range, sc, so, node, offset);
        }
      }
      var F = function() {
      };
      F.prototype = api.rangePrototype;
      constructor.prototype = new F;
      util.extend(constructor.prototype, {setStart:function(node, offset) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        assertValidOffset(node, offset);
        setRangeStart(this, node, offset);
      }, setEnd:function(node, offset) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        assertValidOffset(node, offset);
        setRangeEnd(this, node, offset);
      }, setStartAndEnd:function() {
        var args = arguments;
        var sc = args[0], so = args[1], ec = sc, eo = so;
        switch(args.length) {
          case 3:
            eo = args[2];
            break;
          case 4:
            ec = args[2];
            eo = args[3];
            break;
        }
        boundaryUpdater(this, sc, so, ec, eo);
      }, setBoundary:function(node, offset, isStart) {
        this["set" + (isStart ? "Start" : "End")](node, offset);
      }, setStartBefore:createBeforeAfterNodeSetter(true, true), setStartAfter:createBeforeAfterNodeSetter(false, true), setEndBefore:createBeforeAfterNodeSetter(true, false), setEndAfter:createBeforeAfterNodeSetter(false, false), collapse:function(isStart) {
        assertRangeValid(this);
        if (isStart) {
          boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
        } else {
          boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
        }
      }, selectNodeContents:function(node) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        boundaryUpdater(this, node, 0, node, getNodeLength(node));
      }, selectNode:function(node) {
        assertNoDocTypeNotationEntityAncestor(node, false);
        assertValidNodeType(node, beforeAfterNodeTypes);
        var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
        boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
      }, extractContents:createRangeContentRemover(extractSubtree, boundaryUpdater), deleteContents:createRangeContentRemover(deleteSubtree, boundaryUpdater), canSurroundContents:function() {
        assertRangeValid(this);
        assertNodeNotReadOnly(this.startContainer);
        assertNodeNotReadOnly(this.endContainer);
        var iterator = new RangeIterator(this, true);
        var boundariesInvalid = iterator._first && isNonTextPartiallySelected(iterator._first, this) || iterator._last && isNonTextPartiallySelected(iterator._last, this);
        iterator.detach();
        return!boundariesInvalid;
      }, splitBoundaries:function() {
        splitRangeBoundaries(this);
      }, splitBoundariesPreservingPositions:function(positionsToPreserve) {
        splitRangeBoundaries(this, positionsToPreserve);
      }, normalizeBoundaries:function() {
        assertRangeValid(this);
        var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;
        var mergeForward = function(node) {
          var sibling = node.nextSibling;
          if (sibling && sibling.nodeType == node.nodeType) {
            ec = node;
            eo = node.length;
            node.appendData(sibling.data);
            sibling.parentNode.removeChild(sibling);
          }
        };
        var mergeBackward = function(node) {
          var sibling = node.previousSibling;
          if (sibling && sibling.nodeType == node.nodeType) {
            sc = node;
            var nodeLength = node.length;
            so = sibling.length;
            node.insertData(0, sibling.data);
            sibling.parentNode.removeChild(sibling);
            if (sc == ec) {
              eo += so;
              ec = sc;
            } else {
              if (ec == node.parentNode) {
                var nodeIndex = getNodeIndex(node);
                if (eo == nodeIndex) {
                  ec = node;
                  eo = nodeLength;
                } else {
                  if (eo > nodeIndex) {
                    eo--;
                  }
                }
              }
            }
          }
        };
        var normalizeStart = true;
        if (isCharacterDataNode(ec)) {
          if (ec.length == eo) {
            mergeForward(ec);
          }
        } else {
          if (eo > 0) {
            var endNode = ec.childNodes[eo - 1];
            if (endNode && isCharacterDataNode(endNode)) {
              mergeForward(endNode);
            }
          }
          normalizeStart = !this.collapsed;
        }
        if (normalizeStart) {
          if (isCharacterDataNode(sc)) {
            if (so == 0) {
              mergeBackward(sc);
            }
          } else {
            if (so < sc.childNodes.length) {
              var startNode = sc.childNodes[so];
              if (startNode && isCharacterDataNode(startNode)) {
                mergeBackward(startNode);
              }
            }
          }
        } else {
          sc = ec;
          so = eo;
        }
        boundaryUpdater(this, sc, so, ec, eo);
      }, collapseToPoint:function(node, offset) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        assertValidOffset(node, offset);
        this.setStartAndEnd(node, offset);
      }});
      copyComparisonConstants(constructor);
    }
    function updateCollapsedAndCommonAncestor(range) {
      range.collapsed = range.startContainer === range.endContainer && range.startOffset === range.endOffset;
      range.commonAncestorContainer = range.collapsed ? range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
    }
    function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
      range.startContainer = startContainer;
      range.startOffset = startOffset;
      range.endContainer = endContainer;
      range.endOffset = endOffset;
      range.document = dom.getDocument(startContainer);
      updateCollapsedAndCommonAncestor(range);
    }
    function Range(doc) {
      this.startContainer = doc;
      this.startOffset = 0;
      this.endContainer = doc;
      this.endOffset = 0;
      this.document = doc;
      updateCollapsedAndCommonAncestor(this);
    }
    createPrototypeRange(Range, updateBoundaries);
    util.extend(Range, {rangeProperties:rangeProperties, RangeIterator:RangeIterator, copyComparisonConstants:copyComparisonConstants, createPrototypeRange:createPrototypeRange, inspect:inspect, toHtml:rangeToHtml, getRangeDocument:getRangeDocument, rangesEqual:function(r1, r2) {
      return r1.startContainer === r2.startContainer && r1.startOffset === r2.startOffset && r1.endContainer === r2.endContainer && r1.endOffset === r2.endOffset;
    }});
    api.DomRange = Range;
  });
  api.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
    var WrappedRange, WrappedTextRange;
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DomRange = api.DomRange;
    var getBody = dom.getBody;
    var getContentDocument = dom.getContentDocument;
    var isCharacterDataNode = dom.isCharacterDataNode;
    if (api.features.implementsDomRange) {
      (function() {
        var rangeProto;
        var rangeProperties = DomRange.rangeProperties;
        function updateRangeProperties(range) {
          var i = rangeProperties.length, prop;
          while (i--) {
            prop = rangeProperties[i];
            range[prop] = range.nativeRange[prop];
          }
          range.collapsed = range.startContainer === range.endContainer && range.startOffset === range.endOffset;
        }
        function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
          var startMoved = range.startContainer !== startContainer || range.startOffset != startOffset;
          var endMoved = range.endContainer !== endContainer || range.endOffset != endOffset;
          var nativeRangeDifferent = !range.equals(range.nativeRange);
          if (startMoved || endMoved || nativeRangeDifferent) {
            range.setEnd(endContainer, endOffset);
            range.setStart(startContainer, startOffset);
          }
        }
        var createBeforeAfterNodeSetter;
        WrappedRange = function(range) {
          if (!range) {
            throw module.createError("WrappedRange: Range must be specified");
          }
          this.nativeRange = range;
          updateRangeProperties(this);
        };
        DomRange.createPrototypeRange(WrappedRange, updateNativeRange);
        rangeProto = WrappedRange.prototype;
        rangeProto.selectNode = function(node) {
          this.nativeRange.selectNode(node);
          updateRangeProperties(this);
        };
        rangeProto.cloneContents = function() {
          return this.nativeRange.cloneContents();
        };
        rangeProto.surroundContents = function(node) {
          this.nativeRange.surroundContents(node);
          updateRangeProperties(this);
        };
        rangeProto.collapse = function(isStart) {
          this.nativeRange.collapse(isStart);
          updateRangeProperties(this);
        };
        rangeProto.cloneRange = function() {
          return new WrappedRange(this.nativeRange.cloneRange());
        };
        rangeProto.refresh = function() {
          updateRangeProperties(this);
        };
        rangeProto.toString = function() {
          return this.nativeRange.toString();
        };
        var testTextNode = document.createTextNode("test");
        getBody(document).appendChild(testTextNode);
        var range = document.createRange();
        range.setStart(testTextNode, 0);
        range.setEnd(testTextNode, 0);
        try {
          range.setStart(testTextNode, 1);
          rangeProto.setStart = function(node, offset) {
            this.nativeRange.setStart(node, offset);
            updateRangeProperties(this);
          };
          rangeProto.setEnd = function(node, offset) {
            this.nativeRange.setEnd(node, offset);
            updateRangeProperties(this);
          };
          createBeforeAfterNodeSetter = function(name) {
            return function(node) {
              this.nativeRange[name](node);
              updateRangeProperties(this);
            };
          };
        } catch (ex) {
          rangeProto.setStart = function(node, offset) {
            try {
              this.nativeRange.setStart(node, offset);
            } catch (ex) {
              this.nativeRange.setEnd(node, offset);
              this.nativeRange.setStart(node, offset);
            }
            updateRangeProperties(this);
          };
          rangeProto.setEnd = function(node, offset) {
            try {
              this.nativeRange.setEnd(node, offset);
            } catch (ex) {
              this.nativeRange.setStart(node, offset);
              this.nativeRange.setEnd(node, offset);
            }
            updateRangeProperties(this);
          };
          createBeforeAfterNodeSetter = function(name, oppositeName) {
            return function(node) {
              try {
                this.nativeRange[name](node);
              } catch (ex) {
                this.nativeRange[oppositeName](node);
                this.nativeRange[name](node);
              }
              updateRangeProperties(this);
            };
          };
        }
        rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
        rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
        rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
        rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");
        rangeProto.selectNodeContents = function(node) {
          this.setStartAndEnd(node, 0, dom.getNodeLength(node));
        };
        range.selectNodeContents(testTextNode);
        range.setEnd(testTextNode, 3);
        var range2 = document.createRange();
        range2.selectNodeContents(testTextNode);
        range2.setEnd(testTextNode, 4);
        range2.setStart(testTextNode, 2);
        if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 && range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
          rangeProto.compareBoundaryPoints = function(type, range) {
            range = range.nativeRange || range;
            if (type == range.START_TO_END) {
              type = range.END_TO_START;
            } else {
              if (type == range.END_TO_START) {
                type = range.START_TO_END;
              }
            }
            return this.nativeRange.compareBoundaryPoints(type, range);
          };
        } else {
          rangeProto.compareBoundaryPoints = function(type, range) {
            return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
          };
        }
        var el = document.createElement("div");
        el.innerHTML = "123";
        var textNode = el.firstChild;
        var body = getBody(document);
        body.appendChild(el);
        range.setStart(textNode, 1);
        range.setEnd(textNode, 2);
        range.deleteContents();
        if (textNode.data == "13") {
          rangeProto.deleteContents = function() {
            this.nativeRange.deleteContents();
            updateRangeProperties(this);
          };
          rangeProto.extractContents = function() {
            var frag = this.nativeRange.extractContents();
            updateRangeProperties(this);
            return frag;
          };
        } else {
        }
        body.removeChild(el);
        body = null;
        if (util.isHostMethod(range, "createContextualFragment")) {
          rangeProto.createContextualFragment = function(fragmentStr) {
            return this.nativeRange.createContextualFragment(fragmentStr);
          };
        }
        getBody(document).removeChild(testTextNode);
        rangeProto.getName = function() {
          return "WrappedRange";
        };
        api.WrappedRange = WrappedRange;
        api.createNativeRange = function(doc) {
          doc = getContentDocument(doc, module, "createNativeRange");
          return doc.createRange();
        };
      })();
    }
    if (api.features.implementsTextRange) {
      var getTextRangeContainerElement = function(textRange) {
        var parentEl = textRange.parentElement();
        var range = textRange.duplicate();
        range.collapse(true);
        var startEl = range.parentElement();
        range = textRange.duplicate();
        range.collapse(false);
        var endEl = range.parentElement();
        var startEndContainer = startEl == endEl ? startEl : dom.getCommonAncestor(startEl, endEl);
        return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
      };
      var textRangeIsCollapsed = function(textRange) {
        return textRange.compareEndPoints("StartToEnd", textRange) == 0;
      };
      var getTextRangeBoundaryPosition = function(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
        var workingRange = textRange.duplicate();
        workingRange.collapse(isStart);
        var containerElement = workingRange.parentElement();
        if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
          containerElement = wholeRangeContainerElement;
        }
        if (!containerElement.canHaveHTML) {
          var pos = new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
          return{boundaryPosition:pos, nodeInfo:{nodeIndex:pos.offset, containerElement:pos.node}};
        }
        var workingNode = dom.getDocument(containerElement).createElement("span");
        if (workingNode.parentNode) {
          workingNode.parentNode.removeChild(workingNode);
        }
        var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
        var previousNode, nextNode, boundaryPosition, boundaryNode;
        var start = startInfo && startInfo.containerElement == containerElement ? startInfo.nodeIndex : 0;
        var childNodeCount = containerElement.childNodes.length;
        var end = childNodeCount;
        var nodeIndex = end;
        while (true) {
          if (nodeIndex == childNodeCount) {
            containerElement.appendChild(workingNode);
          } else {
            containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
          }
          workingRange.moveToElementText(workingNode);
          comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
          if (comparison == 0 || start == end) {
            break;
          } else {
            if (comparison == -1) {
              if (end == start + 1) {
                break;
              } else {
                start = nodeIndex;
              }
            } else {
              end = end == start + 1 ? start : nodeIndex;
            }
          }
          nodeIndex = Math.floor((start + end) / 2);
          containerElement.removeChild(workingNode);
        }
        boundaryNode = workingNode.nextSibling;
        if (comparison == -1 && boundaryNode && isCharacterDataNode(boundaryNode)) {
          workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);
          var offset;
          if (/[\r\n]/.test(boundaryNode.data)) {
            var tempRange = workingRange.duplicate();
            var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;
            offset = tempRange.moveStart("character", rangeLength);
            while ((comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
              offset++;
              tempRange.moveStart("character", 1);
            }
          } else {
            offset = workingRange.text.length;
          }
          boundaryPosition = new DomPosition(boundaryNode, offset);
        } else {
          previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
          nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
          if (nextNode && isCharacterDataNode(nextNode)) {
            boundaryPosition = new DomPosition(nextNode, 0);
          } else {
            if (previousNode && isCharacterDataNode(previousNode)) {
              boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
            } else {
              boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
            }
          }
        }
        workingNode.parentNode.removeChild(workingNode);
        return{boundaryPosition:boundaryPosition, nodeInfo:{nodeIndex:nodeIndex, containerElement:containerElement}};
      };
      var createBoundaryTextRange = function(boundaryPosition, isStart) {
        var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
        var doc = dom.getDocument(boundaryPosition.node);
        var workingNode, childNodes, workingRange = getBody(doc).createTextRange();
        var nodeIsDataNode = isCharacterDataNode(boundaryPosition.node);
        if (nodeIsDataNode) {
          boundaryNode = boundaryPosition.node;
          boundaryParent = boundaryNode.parentNode;
        } else {
          childNodes = boundaryPosition.node.childNodes;
          boundaryNode = boundaryOffset < childNodes.length ? childNodes[boundaryOffset] : null;
          boundaryParent = boundaryPosition.node;
        }
        workingNode = doc.createElement("span");
        workingNode.innerHTML = "&#feff;";
        if (boundaryNode) {
          boundaryParent.insertBefore(workingNode, boundaryNode);
        } else {
          boundaryParent.appendChild(workingNode);
        }
        workingRange.moveToElementText(workingNode);
        workingRange.collapse(!isStart);
        boundaryParent.removeChild(workingNode);
        if (nodeIsDataNode) {
          workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
        }
        return workingRange;
      };
      WrappedTextRange = function(textRange) {
        this.textRange = textRange;
        this.refresh();
      };
      WrappedTextRange.prototype = new DomRange(document);
      WrappedTextRange.prototype.refresh = function() {
        var start, end, startBoundary;
        var rangeContainerElement = getTextRangeContainerElement(this.textRange);
        if (textRangeIsCollapsed(this.textRange)) {
          end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, true).boundaryPosition;
        } else {
          startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
          start = startBoundary.boundaryPosition;
          end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false, startBoundary.nodeInfo).boundaryPosition;
        }
        this.setStart(start.node, start.offset);
        this.setEnd(end.node, end.offset);
      };
      WrappedTextRange.prototype.getName = function() {
        return "WrappedTextRange";
      };
      DomRange.copyComparisonConstants(WrappedTextRange);
      var rangeToTextRange = function(range) {
        if (range.collapsed) {
          return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
        } else {
          var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
          var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
          var textRange = getBody(DomRange.getRangeDocument(range)).createTextRange();
          textRange.setEndPoint("StartToStart", startRange);
          textRange.setEndPoint("EndToEnd", endRange);
          return textRange;
        }
      };
      WrappedTextRange.rangeToTextRange = rangeToTextRange;
      WrappedTextRange.prototype.toTextRange = function() {
        return rangeToTextRange(this);
      };
      api.WrappedTextRange = WrappedTextRange;
      if (!api.features.implementsDomRange || api.config.preferTextRange) {
        var globalObj = function(f) {
          return f("return this;")();
        }(Function);
        if (typeof globalObj.Range == "undefined") {
          globalObj.Range = WrappedTextRange;
        }
        api.createNativeRange = function(doc) {
          doc = getContentDocument(doc, module, "createNativeRange");
          return getBody(doc).createTextRange();
        };
        api.WrappedRange = WrappedTextRange;
      }
    }
    api.createRange = function(doc) {
      doc = getContentDocument(doc, module, "createRange");
      return new api.WrappedRange(api.createNativeRange(doc));
    };
    api.createRangyRange = function(doc) {
      doc = getContentDocument(doc, module, "createRangyRange");
      return new DomRange(doc);
    };
    api.createIframeRange = function(iframeEl) {
      module.deprecationNotice("createIframeRange()", "createRange(iframeEl)");
      return api.createRange(iframeEl);
    };
    api.createIframeRangyRange = function(iframeEl) {
      module.deprecationNotice("createIframeRangyRange()", "createRangyRange(iframeEl)");
      return api.createRangyRange(iframeEl);
    };
    api.addShimListener(function(win) {
      var doc = win.document;
      if (typeof doc.createRange == "undefined") {
        doc.createRange = function() {
          return api.createRange(doc);
        };
      }
      doc = win = null;
    });
  });
  api.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
    api.config.checkSelectionRanges = true;
    var BOOLEAN = "boolean";
    var NUMBER = "number";
    var dom = api.dom;
    var util = api.util;
    var isHostMethod = util.isHostMethod;
    var DomRange = api.DomRange;
    var WrappedRange = api.WrappedRange;
    var DOMException = api.DOMException;
    var DomPosition = dom.DomPosition;
    var getNativeSelection;
    var selectionIsCollapsed;
    var features = api.features;
    var CONTROL = "Control";
    var getDocument = dom.getDocument;
    var getBody = dom.getBody;
    var rangesEqual = DomRange.rangesEqual;
    function isDirectionBackward(dir) {
      return typeof dir == "string" ? /^backward(s)?$/i.test(dir) : !!dir;
    }
    function getWindow(win, methodName) {
      if (!win) {
        return window;
      } else {
        if (dom.isWindow(win)) {
          return win;
        } else {
          if (win instanceof WrappedSelection) {
            return win.win;
          } else {
            var doc = dom.getContentDocument(win, module, methodName);
            return dom.getWindow(doc);
          }
        }
      }
    }
    function getWinSelection(winParam) {
      return getWindow(winParam, "getWinSelection").getSelection();
    }
    function getDocSelection(winParam) {
      return getWindow(winParam, "getDocSelection").document.selection;
    }
    function winSelectionIsBackward(sel) {
      var backward = false;
      if (sel.anchorNode) {
        backward = dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1;
      }
      return backward;
    }
    var implementsWinGetSelection = isHostMethod(window, "getSelection"), implementsDocSelection = util.isHostObject(document, "selection");
    features.implementsWinGetSelection = implementsWinGetSelection;
    features.implementsDocSelection = implementsDocSelection;
    var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);
    if (useDocumentSelection) {
      getNativeSelection = getDocSelection;
      api.isSelectionValid = function(winParam) {
        var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;
        return nativeSel.type != "None" || getDocument(nativeSel.createRange().parentElement()) == doc;
      };
    } else {
      if (implementsWinGetSelection) {
        getNativeSelection = getWinSelection;
        api.isSelectionValid = function() {
          return true;
        };
      } else {
        module.fail("Neither document.selection or window.getSelection() detected.");
      }
    }
    api.getNativeSelection = getNativeSelection;
    var testSelection = getNativeSelection();
    var testRange = api.createNativeRange(document);
    var body = getBody(document);
    var selectionHasAnchorAndFocus = util.areHostProperties(testSelection, ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);
    features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;
    var selectionHasExtend = isHostMethod(testSelection, "extend");
    features.selectionHasExtend = selectionHasExtend;
    var selectionHasRangeCount = typeof testSelection.rangeCount == NUMBER;
    features.selectionHasRangeCount = selectionHasRangeCount;
    var selectionSupportsMultipleRanges = false;
    var collapsedNonEditableSelectionsSupported = true;
    var addRangeBackwardToNative = selectionHasExtend ? function(nativeSelection, range) {
      var doc = DomRange.getRangeDocument(range);
      var endRange = api.createRange(doc);
      endRange.collapseToPoint(range.endContainer, range.endOffset);
      nativeSelection.addRange(getNativeRange(endRange));
      nativeSelection.extend(range.startContainer, range.startOffset);
    } : null;
    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) && typeof testSelection.rangeCount == NUMBER && features.implementsDomRange) {
      (function() {
        var sel = window.getSelection();
        if (sel) {
          var originalSelectionRangeCount = sel.rangeCount;
          var selectionHasMultipleRanges = originalSelectionRangeCount > 1;
          var originalSelectionRanges = [];
          var originalSelectionBackward = winSelectionIsBackward(sel);
          for (var i = 0;i < originalSelectionRangeCount;++i) {
            originalSelectionRanges[i] = sel.getRangeAt(i);
          }
          var body = getBody(document);
          var testEl = body.appendChild(document.createElement("div"));
          testEl.contentEditable = "false";
          var textNode = testEl.appendChild(document.createTextNode("\u00a0\u00a0\u00a0"));
          var r1 = document.createRange();
          r1.setStart(textNode, 1);
          r1.collapse(true);
          sel.addRange(r1);
          collapsedNonEditableSelectionsSupported = sel.rangeCount == 1;
          sel.removeAllRanges();
          if (!selectionHasMultipleRanges) {
            var chromeMatch = window.navigator.appVersion.match(/Chrome\/(.*?) /);
            if (chromeMatch && parseInt(chromeMatch[1]) >= 36) {
              selectionSupportsMultipleRanges = false;
            } else {
              var r2 = r1.cloneRange();
              r1.setStart(textNode, 0);
              r2.setEnd(textNode, 3);
              r2.setStart(textNode, 2);
              sel.addRange(r1);
              sel.addRange(r2);
              selectionSupportsMultipleRanges = sel.rangeCount == 2;
            }
          }
          body.removeChild(testEl);
          sel.removeAllRanges();
          for (i = 0;i < originalSelectionRangeCount;++i) {
            if (i == 0 && originalSelectionBackward) {
              if (addRangeBackwardToNative) {
                addRangeBackwardToNative(sel, originalSelectionRanges[i]);
              } else {
                api.warn("Rangy initialization: original selection was backwards but selection has been restored forwards because the browser does not support Selection.extend");
                sel.addRange(originalSelectionRanges[i]);
              }
            } else {
              sel.addRange(originalSelectionRanges[i]);
            }
          }
        }
      })();
    }
    features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
    features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;
    var implementsControlRange = false, testControlRange;
    if (body && isHostMethod(body, "createControlRange")) {
      testControlRange = body.createControlRange();
      if (util.areHostProperties(testControlRange, ["item", "add"])) {
        implementsControlRange = true;
      }
    }
    features.implementsControlRange = implementsControlRange;
    if (selectionHasAnchorAndFocus) {
      selectionIsCollapsed = function(sel) {
        return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
      };
    } else {
      selectionIsCollapsed = function(sel) {
        return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
      };
    }
    function updateAnchorAndFocusFromRange(sel, range, backward) {
      var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
      sel.anchorNode = range[anchorPrefix + "Container"];
      sel.anchorOffset = range[anchorPrefix + "Offset"];
      sel.focusNode = range[focusPrefix + "Container"];
      sel.focusOffset = range[focusPrefix + "Offset"];
    }
    function updateAnchorAndFocusFromNativeSelection(sel) {
      var nativeSel = sel.nativeSelection;
      sel.anchorNode = nativeSel.anchorNode;
      sel.anchorOffset = nativeSel.anchorOffset;
      sel.focusNode = nativeSel.focusNode;
      sel.focusOffset = nativeSel.focusOffset;
    }
    function updateEmptySelection(sel) {
      sel.anchorNode = sel.focusNode = null;
      sel.anchorOffset = sel.focusOffset = 0;
      sel.rangeCount = 0;
      sel.isCollapsed = true;
      sel._ranges.length = 0;
    }
    function getNativeRange(range) {
      var nativeRange;
      if (range instanceof DomRange) {
        nativeRange = api.createNativeRange(range.getDocument());
        nativeRange.setEnd(range.endContainer, range.endOffset);
        nativeRange.setStart(range.startContainer, range.startOffset);
      } else {
        if (range instanceof WrappedRange) {
          nativeRange = range.nativeRange;
        } else {
          if (features.implementsDomRange && range instanceof dom.getWindow(range.startContainer).Range) {
            nativeRange = range;
          }
        }
      }
      return nativeRange;
    }
    function rangeContainsSingleElement(rangeNodes) {
      if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
        return false;
      }
      for (var i = 1, len = rangeNodes.length;i < len;++i) {
        if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
          return false;
        }
      }
      return true;
    }
    function getSingleElementFromRange(range) {
      var nodes = range.getNodes();
      if (!rangeContainsSingleElement(nodes)) {
        throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
      }
      return nodes[0];
    }
    function isTextRange(range) {
      return!!range && typeof range.text != "undefined";
    }
    function updateFromTextRange(sel, range) {
      var wrappedRange = new WrappedRange(range);
      sel._ranges = [wrappedRange];
      updateAnchorAndFocusFromRange(sel, wrappedRange, false);
      sel.rangeCount = 1;
      sel.isCollapsed = wrappedRange.collapsed;
    }
    function updateControlSelection(sel) {
      sel._ranges.length = 0;
      if (sel.docSelection.type == "None") {
        updateEmptySelection(sel);
      } else {
        var controlRange = sel.docSelection.createRange();
        if (isTextRange(controlRange)) {
          updateFromTextRange(sel, controlRange);
        } else {
          sel.rangeCount = controlRange.length;
          var range, doc = getDocument(controlRange.item(0));
          for (var i = 0;i < sel.rangeCount;++i) {
            range = api.createRange(doc);
            range.selectNode(controlRange.item(i));
            sel._ranges.push(range);
          }
          sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
          updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
        }
      }
    }
    function addRangeToControlSelection(sel, range) {
      var controlRange = sel.docSelection.createRange();
      var rangeElement = getSingleElementFromRange(range);
      var doc = getDocument(controlRange.item(0));
      var newControlRange = getBody(doc).createControlRange();
      for (var i = 0, len = controlRange.length;i < len;++i) {
        newControlRange.add(controlRange.item(i));
      }
      try {
        newControlRange.add(rangeElement);
      } catch (ex) {
        throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
      }
      newControlRange.select();
      updateControlSelection(sel);
    }
    var getSelectionRangeAt;
    if (isHostMethod(testSelection, "getRangeAt")) {
      getSelectionRangeAt = function(sel, index) {
        try {
          return sel.getRangeAt(index);
        } catch (ex) {
          return null;
        }
      };
    } else {
      if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
          var doc = getDocument(sel.anchorNode);
          var range = api.createRange(doc);
          range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);
          if (range.collapsed !== this.isCollapsed) {
            range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
          }
          return range;
        };
      }
    }
    function WrappedSelection(selection, docSelection, win) {
      this.nativeSelection = selection;
      this.docSelection = docSelection;
      this._ranges = [];
      this.win = win;
      this.refresh();
    }
    WrappedSelection.prototype = api.selectionPrototype;
    function deleteProperties(sel) {
      sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
      sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
      sel.detached = true;
    }
    var cachedRangySelections = [];
    function actOnCachedSelection(win, action) {
      var i = cachedRangySelections.length, cached, sel;
      while (i--) {
        cached = cachedRangySelections[i];
        sel = cached.selection;
        if (action == "deleteAll") {
          deleteProperties(sel);
        } else {
          if (cached.win == win) {
            if (action == "delete") {
              cachedRangySelections.splice(i, 1);
              return true;
            } else {
              return sel;
            }
          }
        }
      }
      if (action == "deleteAll") {
        cachedRangySelections.length = 0;
      }
      return null;
    }
    var getSelection = function(win) {
      if (win && win instanceof WrappedSelection) {
        win.refresh();
        return win;
      }
      win = getWindow(win, "getNativeSelection");
      var sel = actOnCachedSelection(win);
      var nativeSel = getNativeSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
      if (sel) {
        sel.nativeSelection = nativeSel;
        sel.docSelection = docSel;
        sel.refresh();
      } else {
        sel = new WrappedSelection(nativeSel, docSel, win);
        cachedRangySelections.push({win:win, selection:sel});
      }
      return sel;
    };
    api.getSelection = getSelection;
    api.getIframeSelection = function(iframeEl) {
      module.deprecationNotice("getIframeSelection()", "getSelection(iframeEl)");
      return api.getSelection(dom.getIframeWindow(iframeEl));
    };
    var selProto = WrappedSelection.prototype;
    function createControlSelection(sel, ranges) {
      var doc = getDocument(ranges[0].startContainer);
      var controlRange = getBody(doc).createControlRange();
      for (var i = 0, el, len = ranges.length;i < len;++i) {
        el = getSingleElementFromRange(ranges[i]);
        try {
          controlRange.add(el);
        } catch (ex) {
          throw module.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)");
        }
      }
      controlRange.select();
      updateControlSelection(sel);
    }
    if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
      selProto.removeAllRanges = function() {
        this.nativeSelection.removeAllRanges();
        updateEmptySelection(this);
      };
      var addRangeBackward = function(sel, range) {
        addRangeBackwardToNative(sel.nativeSelection, range);
        sel.refresh();
      };
      if (selectionHasRangeCount) {
        selProto.addRange = function(range, direction) {
          if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
            addRangeToControlSelection(this, range);
          } else {
            if (isDirectionBackward(direction) && selectionHasExtend) {
              addRangeBackward(this, range);
            } else {
              var previousRangeCount;
              if (selectionSupportsMultipleRanges) {
                previousRangeCount = this.rangeCount;
              } else {
                this.removeAllRanges();
                previousRangeCount = 0;
              }
              var clonedNativeRange = getNativeRange(range).cloneRange();
              try {
                this.nativeSelection.addRange(clonedNativeRange);
              } catch (ex) {
              }
              this.rangeCount = this.nativeSelection.rangeCount;
              if (this.rangeCount == previousRangeCount + 1) {
                if (api.config.checkSelectionRanges) {
                  var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                  if (nativeRange && !rangesEqual(nativeRange, range)) {
                    range = new WrappedRange(nativeRange);
                  }
                }
                this._ranges[this.rangeCount - 1] = range;
                updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                this.isCollapsed = selectionIsCollapsed(this);
              } else {
                this.refresh();
              }
            }
          }
        };
      } else {
        selProto.addRange = function(range, direction) {
          if (isDirectionBackward(direction) && selectionHasExtend) {
            addRangeBackward(this, range);
          } else {
            this.nativeSelection.addRange(getNativeRange(range));
            this.refresh();
          }
        };
      }
      selProto.setRanges = function(ranges) {
        if (implementsControlRange && implementsDocSelection && ranges.length > 1) {
          createControlSelection(this, ranges);
        } else {
          this.removeAllRanges();
          for (var i = 0, len = ranges.length;i < len;++i) {
            this.addRange(ranges[i]);
          }
        }
      };
    } else {
      if (isHostMethod(testSelection, "empty") && isHostMethod(testRange, "select") && implementsControlRange && useDocumentSelection) {
        selProto.removeAllRanges = function() {
          try {
            this.docSelection.empty();
            if (this.docSelection.type != "None") {
              var doc;
              if (this.anchorNode) {
                doc = getDocument(this.anchorNode);
              } else {
                if (this.docSelection.type == CONTROL) {
                  var controlRange = this.docSelection.createRange();
                  if (controlRange.length) {
                    doc = getDocument(controlRange.item(0));
                  }
                }
              }
              if (doc) {
                var textRange = getBody(doc).createTextRange();
                textRange.select();
                this.docSelection.empty();
              }
            }
          } catch (ex) {
          }
          updateEmptySelection(this);
        };
        selProto.addRange = function(range) {
          if (this.docSelection.type == CONTROL) {
            addRangeToControlSelection(this, range);
          } else {
            api.WrappedTextRange.rangeToTextRange(range).select();
            this._ranges[0] = range;
            this.rangeCount = 1;
            this.isCollapsed = this._ranges[0].collapsed;
            updateAnchorAndFocusFromRange(this, range, false);
          }
        };
        selProto.setRanges = function(ranges) {
          this.removeAllRanges();
          var rangeCount = ranges.length;
          if (rangeCount > 1) {
            createControlSelection(this, ranges);
          } else {
            if (rangeCount) {
              this.addRange(ranges[0]);
            }
          }
        };
      } else {
        module.fail("No means of selecting a Range or TextRange was found");
        return false;
      }
    }
    selProto.getRangeAt = function(index) {
      if (index < 0 || index >= this.rangeCount) {
        throw new DOMException("INDEX_SIZE_ERR");
      } else {
        return this._ranges[index].cloneRange();
      }
    };
    var refreshSelection;
    if (useDocumentSelection) {
      refreshSelection = function(sel) {
        var range;
        if (api.isSelectionValid(sel.win)) {
          range = sel.docSelection.createRange();
        } else {
          range = getBody(sel.win.document).createTextRange();
          range.collapse(true);
        }
        if (sel.docSelection.type == CONTROL) {
          updateControlSelection(sel);
        } else {
          if (isTextRange(range)) {
            updateFromTextRange(sel, range);
          } else {
            updateEmptySelection(sel);
          }
        }
      };
    } else {
      if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
        refreshSelection = function(sel) {
          if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
            updateControlSelection(sel);
          } else {
            sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
            if (sel.rangeCount) {
              for (var i = 0, len = sel.rangeCount;i < len;++i) {
                sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
              }
              updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
              sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
              updateEmptySelection(sel);
            }
          }
        };
      } else {
        if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
          refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
              range = getSelectionRangeAt(nativeSel, 0);
              sel._ranges = [range];
              sel.rangeCount = 1;
              updateAnchorAndFocusFromNativeSelection(sel);
              sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
              updateEmptySelection(sel);
            }
          };
        } else {
          module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
          return false;
        }
      }
    }
    selProto.refresh = function(checkForChanges) {
      var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
      var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;
      refreshSelection(this);
      if (checkForChanges) {
        var i = oldRanges.length;
        if (i != this._ranges.length) {
          return true;
        }
        if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
          return true;
        }
        while (i--) {
          if (!rangesEqual(oldRanges[i], this._ranges[i])) {
            return true;
          }
        }
        return false;
      }
    };
    var removeRangeManually = function(sel, range) {
      var ranges = sel.getAllRanges();
      sel.removeAllRanges();
      for (var i = 0, len = ranges.length;i < len;++i) {
        if (!rangesEqual(range, ranges[i])) {
          sel.addRange(ranges[i]);
        }
      }
      if (!sel.rangeCount) {
        updateEmptySelection(sel);
      }
    };
    if (implementsControlRange && implementsDocSelection) {
      selProto.removeRange = function(range) {
        if (this.docSelection.type == CONTROL) {
          var controlRange = this.docSelection.createRange();
          var rangeElement = getSingleElementFromRange(range);
          var doc = getDocument(controlRange.item(0));
          var newControlRange = getBody(doc).createControlRange();
          var el, removed = false;
          for (var i = 0, len = controlRange.length;i < len;++i) {
            el = controlRange.item(i);
            if (el !== rangeElement || removed) {
              newControlRange.add(controlRange.item(i));
            } else {
              removed = true;
            }
          }
          newControlRange.select();
          updateControlSelection(this);
        } else {
          removeRangeManually(this, range);
        }
      };
    } else {
      selProto.removeRange = function(range) {
        removeRangeManually(this, range);
      };
    }
    var selectionIsBackward;
    if (!useDocumentSelection && selectionHasAnchorAndFocus && features.implementsDomRange) {
      selectionIsBackward = winSelectionIsBackward;
      selProto.isBackward = function() {
        return selectionIsBackward(this);
      };
    } else {
      selectionIsBackward = selProto.isBackward = function() {
        return false;
      };
    }
    selProto.isBackwards = selProto.isBackward;
    selProto.toString = function() {
      var rangeTexts = [];
      for (var i = 0, len = this.rangeCount;i < len;++i) {
        rangeTexts[i] = "" + this._ranges[i];
      }
      return rangeTexts.join("");
    };
    function assertNodeInSameDocument(sel, node) {
      if (sel.win.document != getDocument(node)) {
        throw new DOMException("WRONG_DOCUMENT_ERR");
      }
    }
    selProto.collapse = function(node, offset) {
      assertNodeInSameDocument(this, node);
      var range = api.createRange(node);
      range.collapseToPoint(node, offset);
      this.setSingleRange(range);
      this.isCollapsed = true;
    };
    selProto.collapseToStart = function() {
      if (this.rangeCount) {
        var range = this._ranges[0];
        this.collapse(range.startContainer, range.startOffset);
      } else {
        throw new DOMException("INVALID_STATE_ERR");
      }
    };
    selProto.collapseToEnd = function() {
      if (this.rangeCount) {
        var range = this._ranges[this.rangeCount - 1];
        this.collapse(range.endContainer, range.endOffset);
      } else {
        throw new DOMException("INVALID_STATE_ERR");
      }
    };
    selProto.selectAllChildren = function(node) {
      assertNodeInSameDocument(this, node);
      var range = api.createRange(node);
      range.selectNodeContents(node);
      this.setSingleRange(range);
    };
    selProto.deleteFromDocument = function() {
      if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
        var controlRange = this.docSelection.createRange();
        var element;
        while (controlRange.length) {
          element = controlRange.item(0);
          controlRange.remove(element);
          element.parentNode.removeChild(element);
        }
        this.refresh();
      } else {
        if (this.rangeCount) {
          var ranges = this.getAllRanges();
          if (ranges.length) {
            this.removeAllRanges();
            for (var i = 0, len = ranges.length;i < len;++i) {
              ranges[i].deleteContents();
            }
            this.addRange(ranges[len - 1]);
          }
        }
      }
    };
    selProto.eachRange = function(func, returnValue) {
      for (var i = 0, len = this._ranges.length;i < len;++i) {
        if (func(this.getRangeAt(i))) {
          return returnValue;
        }
      }
    };
    selProto.getAllRanges = function() {
      var ranges = [];
      this.eachRange(function(range) {
        ranges.push(range);
      });
      return ranges;
    };
    selProto.setSingleRange = function(range, direction) {
      this.removeAllRanges();
      this.addRange(range, direction);
    };
    selProto.callMethodOnEachRange = function(methodName, params) {
      var results = [];
      this.eachRange(function(range) {
        results.push(range[methodName].apply(range, params));
      });
      return results;
    };
    function createStartOrEndSetter(isStart) {
      return function(node, offset) {
        var range;
        if (this.rangeCount) {
          range = this.getRangeAt(0);
          range["set" + (isStart ? "Start" : "End")](node, offset);
        } else {
          range = api.createRange(this.win.document);
          range.setStartAndEnd(node, offset);
        }
        this.setSingleRange(range, this.isBackward());
      };
    }
    selProto.setStart = createStartOrEndSetter(true);
    selProto.setEnd = createStartOrEndSetter(false);
    api.rangePrototype.select = function(direction) {
      getSelection(this.getDocument()).setSingleRange(this, direction);
    };
    selProto.changeEachRange = function(func) {
      var ranges = [];
      var backward = this.isBackward();
      this.eachRange(function(range) {
        func(range);
        ranges.push(range);
      });
      this.removeAllRanges();
      if (backward && ranges.length == 1) {
        this.addRange(ranges[0], "backward");
      } else {
        this.setRanges(ranges);
      }
    };
    selProto.containsNode = function(node, allowPartial) {
      return this.eachRange(function(range) {
        return range.containsNode(node, allowPartial);
      }, true) || false;
    };
    selProto.getBookmark = function(containerNode) {
      return{backward:this.isBackward(), rangeBookmarks:this.callMethodOnEachRange("getBookmark", [containerNode])};
    };
    selProto.moveToBookmark = function(bookmark) {
      var selRanges = [];
      for (var i = 0, rangeBookmark, range;rangeBookmark = bookmark.rangeBookmarks[i++];) {
        range = api.createRange(this.win);
        range.moveToBookmark(rangeBookmark);
        selRanges.push(range);
      }
      if (bookmark.backward) {
        this.setSingleRange(selRanges[0], "backward");
      } else {
        this.setRanges(selRanges);
      }
    };
    selProto.toHtml = function() {
      var rangeHtmls = [];
      this.eachRange(function(range) {
        rangeHtmls.push(DomRange.toHtml(range));
      });
      return rangeHtmls.join("");
    };
    if (features.implementsTextRange) {
      selProto.getNativeTextRange = function() {
        var sel, textRange;
        if (sel = this.docSelection) {
          var range = sel.createRange();
          if (isTextRange(range)) {
            return range;
          } else {
            throw module.createError("getNativeTextRange: selection is a control selection");
          }
        } else {
          if (this.rangeCount > 0) {
            return api.WrappedTextRange.rangeToTextRange(this.getRangeAt(0));
          } else {
            throw module.createError("getNativeTextRange: selection contains no range");
          }
        }
      };
    }
    function inspect(sel) {
      var rangeInspects = [];
      var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
      var focus = new DomPosition(sel.focusNode, sel.focusOffset);
      var name = typeof sel.getName == "function" ? sel.getName() : "Selection";
      if (typeof sel.rangeCount != "undefined") {
        for (var i = 0, len = sel.rangeCount;i < len;++i) {
          rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
        }
      }
      return "[" + name + "(Ranges: " + rangeInspects.join(", ") + ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
    }
    selProto.getName = function() {
      return "WrappedSelection";
    };
    selProto.inspect = function() {
      return inspect(this);
    };
    selProto.detach = function() {
      actOnCachedSelection(this.win, "delete");
      deleteProperties(this);
    };
    WrappedSelection.detachAll = function() {
      actOnCachedSelection(null, "deleteAll");
    };
    WrappedSelection.inspect = inspect;
    WrappedSelection.isDirectionBackward = isDirectionBackward;
    api.Selection = WrappedSelection;
    api.selectionPrototype = selProto;
    api.addShimListener(function(win) {
      if (typeof win.getSelection == "undefined") {
        win.getSelection = function() {
          return getSelection(win);
        };
      }
      win = null;
    });
  });
  var docReady = false;
  var loadHandler = function(e) {
    if (!docReady) {
      docReady = true;
      if (!api.initialized && api.config.autoInitialize) {
        init();
      }
    }
  };
  if (isBrowser) {
    if (document.readyState == "complete") {
      loadHandler();
    } else {
      if (isHostMethod(document, "addEventListener")) {
        document.addEventListener("DOMContentLoaded", loadHandler, false);
      }
      addListener(window, "load", loadHandler);
    }
  }
  return api;
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("ClassApplier", ["WrappedSelection"], function(api, module) {
    var dom = api.dom;
    var DomPosition = dom.DomPosition;
    var contains = dom.arrayContains;
    var isHtmlNamespace = dom.isHtmlNamespace;
    var defaultTagName = "span";
    function each(obj, func) {
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (func(i, obj[i]) === false) {
            return false;
          }
        }
      }
      return true;
    }
    function trim(str) {
      return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }
    function hasClass(el, className) {
      return el.className && (new RegExp("(?:^|\\s)" + className + "(?:\\s|$)")).test(el.className);
    }
    function addClass(el, className) {
      if (el.className) {
        if (!hasClass(el, className)) {
          el.className += " " + className;
        }
      } else {
        el.className = className;
      }
    }
    var removeClass = function() {
      function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
        return whiteSpaceBefore && whiteSpaceAfter ? " " : "";
      }
      return function(el, className) {
        if (el.className) {
          el.className = el.className.replace(new RegExp("(^|\\s)" + className + "(\\s|$)"), replacer);
        }
      };
    }();
    function sortClassName(className) {
      return className && className.split(/\s+/).sort().join(" ");
    }
    function getSortedClassName(el) {
      return sortClassName(el.className);
    }
    function haveSameClasses(el1, el2) {
      return getSortedClassName(el1) == getSortedClassName(el2);
    }
    function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
      var posNode = position.node, posOffset = position.offset;
      var newNode = posNode, newOffset = posOffset;
      if (posNode == newParent && posOffset > newIndex) {
        ++newOffset;
      }
      if (posNode == oldParent && (posOffset == oldIndex || posOffset == oldIndex + 1)) {
        newNode = newParent;
        newOffset += newIndex - oldIndex;
      }
      if (posNode == oldParent && posOffset > oldIndex + 1) {
        --newOffset;
      }
      position.node = newNode;
      position.offset = newOffset;
    }
    function movePositionWhenRemovingNode(position, parentNode, index) {
      if (position.node == parentNode && position.offset > index) {
        --position.offset;
      }
    }
    function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
      if (newIndex == -1) {
        newIndex = newParent.childNodes.length;
      }
      var oldParent = node.parentNode;
      var oldIndex = dom.getNodeIndex(node);
      for (var i = 0, position;position = positionsToPreserve[i++];) {
        movePosition(position, oldParent, oldIndex, newParent, newIndex);
      }
      if (newParent.childNodes.length == newIndex) {
        newParent.appendChild(node);
      } else {
        newParent.insertBefore(node, newParent.childNodes[newIndex]);
      }
    }
    function removePreservingPositions(node, positionsToPreserve) {
      var oldParent = node.parentNode;
      var oldIndex = dom.getNodeIndex(node);
      for (var i = 0, position;position = positionsToPreserve[i++];) {
        movePositionWhenRemovingNode(position, oldParent, oldIndex);
      }
      node.parentNode.removeChild(node);
    }
    function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
      var child, children = [];
      while (child = node.firstChild) {
        movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
        children.push(child);
      }
      if (removeNode) {
        removePreservingPositions(node, positionsToPreserve);
      }
      return children;
    }
    function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
      return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
    }
    function rangeSelectsAnyText(range, textNode) {
      var textNodeRange = range.cloneRange();
      textNodeRange.selectNodeContents(textNode);
      var intersectionRange = textNodeRange.intersection(range);
      var text = intersectionRange ? intersectionRange.toString() : "";
      return text != "";
    }
    function getEffectiveTextNodes(range) {
      var nodes = range.getNodes([3]);
      var start = 0, node;
      while ((node = nodes[start]) && !rangeSelectsAnyText(range, node)) {
        ++start;
      }
      var end = nodes.length - 1;
      while ((node = nodes[end]) && !rangeSelectsAnyText(range, node)) {
        --end;
      }
      return nodes.slice(start, end + 1);
    }
    function elementsHaveSameNonClassAttributes(el1, el2) {
      if (el1.attributes.length != el2.attributes.length) {
        return false;
      }
      for (var i = 0, len = el1.attributes.length, attr1, attr2, name;i < len;++i) {
        attr1 = el1.attributes[i];
        name = attr1.name;
        if (name != "class") {
          attr2 = el2.attributes.getNamedItem(name);
          if (attr1 === null != (attr2 === null)) {
            return false;
          }
          if (attr1.specified != attr2.specified) {
            return false;
          }
          if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) {
            return false;
          }
        }
      }
      return true;
    }
    function elementHasNonClassAttributes(el, exceptions) {
      for (var i = 0, len = el.attributes.length, attrName;i < len;++i) {
        attrName = el.attributes[i].name;
        if (!(exceptions && contains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
          return true;
        }
      }
      return false;
    }
    function elementHasProperties(el, props) {
      return each(props, function(p, propValue) {
        if (typeof propValue == "object") {
          if (!elementHasProperties(el[p], propValue)) {
            return false;
          }
        } else {
          if (el[p] !== propValue) {
            return false;
          }
        }
      });
    }
    var getComputedStyleProperty = dom.getComputedStyleProperty;
    var isEditableElement = function() {
      var testEl = document.createElement("div");
      return typeof testEl.isContentEditable == "boolean" ? function(node) {
        return node && node.nodeType == 1 && node.isContentEditable;
      } : function(node) {
        if (!node || node.nodeType != 1 || node.contentEditable == "false") {
          return false;
        }
        return node.contentEditable == "true" || isEditableElement(node.parentNode);
      };
    }();
    function isEditingHost(node) {
      var parent;
      return node && node.nodeType == 1 && ((parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on" || isEditableElement(node) && !isEditableElement(node.parentNode));
    }
    function isEditable(node) {
      return(isEditableElement(node) || node.nodeType != 1 && isEditableElement(node.parentNode)) && !isEditingHost(node);
    }
    var inlineDisplayRegex = /^inline(-block|-table)?$/i;
    function isNonInlineElement(node) {
      return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;
    function isUnrenderedWhiteSpaceNode(node) {
      if (node.data.length == 0) {
        return true;
      }
      if (htmlNonWhiteSpaceRegex.test(node.data)) {
        return false;
      }
      var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
      switch(cssWhiteSpace) {
        case "pre":
        ;
        case "pre-wrap":
        ;
        case "-moz-pre-wrap":
          return false;
        case "pre-line":
          if (/[\r\n]/.test(node.data)) {
            return false;
          }
        ;
      }
      return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }
    function getRangeBoundaries(ranges) {
      var positions = [], i, range;
      for (i = 0;range = ranges[i++];) {
        positions.push(new DomPosition(range.startContainer, range.startOffset), new DomPosition(range.endContainer, range.endOffset));
      }
      return positions;
    }
    function updateRangesFromBoundaries(ranges, positions) {
      for (var i = 0, range, start, end, len = ranges.length;i < len;++i) {
        range = ranges[i];
        start = positions[i * 2];
        end = positions[i * 2 + 1];
        range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
      }
    }
    function isSplitPoint(node, offset) {
      if (dom.isCharacterDataNode(node)) {
        if (offset == 0) {
          return!!node.previousSibling;
        } else {
          if (offset == node.length) {
            return!!node.nextSibling;
          } else {
            return true;
          }
        }
      }
      return offset > 0 && offset < node.childNodes.length;
    }
    function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
      var newNode, parentNode;
      var splitAtStart = descendantOffset == 0;
      if (dom.isAncestorOf(descendantNode, node)) {
        return node;
      }
      if (dom.isCharacterDataNode(descendantNode)) {
        var descendantIndex = dom.getNodeIndex(descendantNode);
        if (descendantOffset == 0) {
          descendantOffset = descendantIndex;
        } else {
          if (descendantOffset == descendantNode.length) {
            descendantOffset = descendantIndex + 1;
          } else {
            throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node (" + descendantOffset + " in " + descendantNode.data);
          }
        }
        descendantNode = descendantNode.parentNode;
      }
      if (isSplitPoint(descendantNode, descendantOffset)) {
        newNode = descendantNode.cloneNode(false);
        parentNode = descendantNode.parentNode;
        if (newNode.id) {
          newNode.removeAttribute("id");
        }
        var child, newChildIndex = 0;
        while (child = descendantNode.childNodes[descendantOffset]) {
          movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
        }
        movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
        return descendantNode == node ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
      } else {
        if (node != descendantNode) {
          newNode = descendantNode.parentNode;
          var newNodeIndex = dom.getNodeIndex(descendantNode);
          if (!splitAtStart) {
            newNodeIndex++;
          }
          return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
        }
      }
      return node;
    }
    function areElementsMergeable(el1, el2) {
      return el1.namespaceURI == el2.namespaceURI && el1.tagName.toLowerCase() == el2.tagName.toLowerCase() && haveSameClasses(el1, el2) && elementsHaveSameNonClassAttributes(el1, el2) && getComputedStyleProperty(el1, "display") == "inline" && getComputedStyleProperty(el2, "display") == "inline";
    }
    function createAdjacentMergeableTextNodeGetter(forward) {
      var siblingPropName = forward ? "nextSibling" : "previousSibling";
      return function(textNode, checkParentElement) {
        var el = textNode.parentNode;
        var adjacentNode = textNode[siblingPropName];
        if (adjacentNode) {
          if (adjacentNode && adjacentNode.nodeType == 3) {
            return adjacentNode;
          }
        } else {
          if (checkParentElement) {
            adjacentNode = el[siblingPropName];
            if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
              var adjacentNodeChild = adjacentNode[forward ? "firstChild" : "lastChild"];
              if (adjacentNodeChild && adjacentNodeChild.nodeType == 3) {
                return adjacentNodeChild;
              }
            }
          }
        }
        return null;
      };
    }
    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false), getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);
    function Merge(firstNode) {
      this.isElementMerge = firstNode.nodeType == 1;
      this.textNodes = [];
      var firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
      if (firstTextNode) {
        this.textNodes[0] = firstTextNode;
      }
    }
    Merge.prototype = {doMerge:function(positionsToPreserve) {
      var textNodes = this.textNodes;
      var firstTextNode = textNodes[0];
      if (textNodes.length > 1) {
        var firstTextNodeIndex = dom.getNodeIndex(firstTextNode);
        var textParts = [], combinedTextLength = 0, textNode, parent;
        for (var i = 0, len = textNodes.length, j, position;i < len;++i) {
          textNode = textNodes[i];
          parent = textNode.parentNode;
          if (i > 0) {
            parent.removeChild(textNode);
            if (!parent.hasChildNodes()) {
              parent.parentNode.removeChild(parent);
            }
            if (positionsToPreserve) {
              for (j = 0;position = positionsToPreserve[j++];) {
                if (position.node == textNode) {
                  position.node = firstTextNode;
                  position.offset += combinedTextLength;
                }
                if (position.node == parent && position.offset > firstTextNodeIndex) {
                  --position.offset;
                  if (position.offset == firstTextNodeIndex + 1 && i < len - 1) {
                    position.node = firstTextNode;
                    position.offset = combinedTextLength;
                  }
                }
              }
            }
          }
          textParts[i] = textNode.data;
          combinedTextLength += textNode.data.length;
        }
        firstTextNode.data = textParts.join("");
      }
      return firstTextNode.data;
    }, getLength:function() {
      var i = this.textNodes.length, len = 0;
      while (i--) {
        len += this.textNodes[i].length;
      }
      return len;
    }, toString:function() {
      var textParts = [];
      for (var i = 0, len = this.textNodes.length;i < len;++i) {
        textParts[i] = "'" + this.textNodes[i].data + "'";
      }
      return "[Merge(" + textParts.join(",") + ")]";
    }};
    var optionProperties = ["elementTagName", "ignoreWhiteSpace", "applyToEditableOnly", "useExistingElements", "removeEmptyElements", "onElementCreate"];
    var attrNamesForProperties = {};
    function ClassApplier(className, options, tagNames) {
      var normalize, i, len, propName, applier = this;
      applier.cssClass = applier.className = className;
      var elementPropertiesFromOptions = null, elementAttributes = {};
      if (typeof options == "object" && options !== null) {
        tagNames = options.tagNames;
        elementPropertiesFromOptions = options.elementProperties;
        elementAttributes = options.elementAttributes;
        for (i = 0;propName = optionProperties[i++];) {
          if (options.hasOwnProperty(propName)) {
            applier[propName] = options[propName];
          }
        }
        normalize = options.normalize;
      } else {
        normalize = options;
      }
      applier.normalize = typeof normalize == "undefined" ? true : normalize;
      applier.attrExceptions = [];
      var el = document.createElement(applier.elementTagName);
      applier.elementProperties = applier.copyPropertiesToElement(elementPropertiesFromOptions, el, true);
      each(elementAttributes, function(attrName) {
        applier.attrExceptions.push(attrName);
      });
      applier.elementAttributes = elementAttributes;
      applier.elementSortedClassName = applier.elementProperties.hasOwnProperty("className") ? applier.elementProperties.className : className;
      applier.applyToAnyTagName = false;
      var type = typeof tagNames;
      if (type == "string") {
        if (tagNames == "*") {
          applier.applyToAnyTagName = true;
        } else {
          applier.tagNames = trim(tagNames.toLowerCase()).split(/\s*,\s*/);
        }
      } else {
        if (type == "object" && typeof tagNames.length == "number") {
          applier.tagNames = [];
          for (i = 0, len = tagNames.length;i < len;++i) {
            if (tagNames[i] == "*") {
              applier.applyToAnyTagName = true;
            } else {
              applier.tagNames.push(tagNames[i].toLowerCase());
            }
          }
        } else {
          applier.tagNames = [applier.elementTagName];
        }
      }
    }
    ClassApplier.prototype = {elementTagName:defaultTagName, elementProperties:{}, elementAttributes:{}, ignoreWhiteSpace:true, applyToEditableOnly:false, useExistingElements:true, removeEmptyElements:true, onElementCreate:null, copyPropertiesToElement:function(props, el, createCopy) {
      var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;
      for (var p in props) {
        if (props.hasOwnProperty(p)) {
          propValue = props[p];
          elPropValue = el[p];
          if (p == "className") {
            addClass(el, propValue);
            addClass(el, this.className);
            el[p] = sortClassName(el[p]);
            if (createCopy) {
              elProps[p] = el[p];
            }
          } else {
            if (p == "style") {
              elStyle = elPropValue;
              if (createCopy) {
                elProps[p] = elPropsStyle = {};
              }
              for (s in props[p]) {
                elStyle[s] = propValue[s];
                if (createCopy) {
                  elPropsStyle[s] = elStyle[s];
                }
              }
              this.attrExceptions.push(p);
            } else {
              el[p] = propValue;
              if (createCopy) {
                elProps[p] = el[p];
                attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
                this.attrExceptions.push(attrName);
              }
            }
          }
        }
      }
      return createCopy ? elProps : "";
    }, copyAttributesToElement:function(attrs, el) {
      for (var attrName in attrs) {
        if (attrs.hasOwnProperty(attrName)) {
          el.setAttribute(attrName, attrs[attrName]);
        }
      }
    }, hasClass:function(node) {
      return node.nodeType == 1 && contains(this.tagNames, node.tagName.toLowerCase()) && hasClass(node, this.className);
    }, getSelfOrAncestorWithClass:function(node) {
      while (node) {
        if (this.hasClass(node)) {
          return node;
        }
        node = node.parentNode;
      }
      return null;
    }, isModifiable:function(node) {
      return!this.applyToEditableOnly || isEditable(node);
    }, isIgnorableWhiteSpaceNode:function(node) {
      return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
    }, postApply:function(textNodes, range, positionsToPreserve, isUndo) {
      var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];
      var merges = [], currentMerge;
      var rangeStartNode = firstNode, rangeEndNode = lastNode;
      var rangeStartOffset = 0, rangeEndOffset = lastNode.length;
      var textNode, precedingTextNode;
      for (var i = 0, len = textNodes.length;i < len;++i) {
        textNode = textNodes[i];
        precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
        if (precedingTextNode) {
          if (!currentMerge) {
            currentMerge = new Merge(precedingTextNode);
            merges.push(currentMerge);
          }
          currentMerge.textNodes.push(textNode);
          if (textNode === firstNode) {
            rangeStartNode = currentMerge.textNodes[0];
            rangeStartOffset = rangeStartNode.length;
          }
          if (textNode === lastNode) {
            rangeEndNode = currentMerge.textNodes[0];
            rangeEndOffset = currentMerge.getLength();
          }
        } else {
          currentMerge = null;
        }
      }
      var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);
      if (nextTextNode) {
        if (!currentMerge) {
          currentMerge = new Merge(lastNode);
          merges.push(currentMerge);
        }
        currentMerge.textNodes.push(nextTextNode);
      }
      if (merges.length) {
        for (i = 0, len = merges.length;i < len;++i) {
          merges[i].doMerge(positionsToPreserve);
        }
        range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
      }
    }, createContainer:function(doc) {
      var el = doc.createElement(this.elementTagName);
      this.copyPropertiesToElement(this.elementProperties, el, false);
      this.copyAttributesToElement(this.elementAttributes, el);
      addClass(el, this.className);
      if (this.onElementCreate) {
        this.onElementCreate(el, this);
      }
      return el;
    }, applyToTextNode:function(textNode, positionsToPreserve) {
      var parent = textNode.parentNode;
      if (parent.childNodes.length == 1 && this.useExistingElements && isHtmlNamespace(parent) && contains(this.tagNames, parent.tagName.toLowerCase()) && elementHasProperties(parent, this.elementProperties)) {
        addClass(parent, this.className);
      } else {
        var el = this.createContainer(dom.getDocument(textNode));
        textNode.parentNode.insertBefore(el, textNode);
        el.appendChild(textNode);
      }
    }, isRemovable:function(el) {
      return isHtmlNamespace(el) && el.tagName.toLowerCase() == this.elementTagName && getSortedClassName(el) == this.elementSortedClassName && elementHasProperties(el, this.elementProperties) && !elementHasNonClassAttributes(el, this.attrExceptions) && this.isModifiable(el);
    }, isEmptyContainer:function(el) {
      var childNodeCount = el.childNodes.length;
      return el.nodeType == 1 && this.isRemovable(el) && (childNodeCount == 0 || childNodeCount == 1 && this.isEmptyContainer(el.firstChild));
    }, removeEmptyContainers:function(range) {
      var applier = this;
      var nodesToRemove = range.getNodes([1], function(el) {
        return applier.isEmptyContainer(el);
      });
      var rangesToPreserve = [range];
      var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
      for (var i = 0, node;node = nodesToRemove[i++];) {
        removePreservingPositions(node, positionsToPreserve);
      }
      updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
    }, undoToTextNode:function(textNode, range, ancestorWithClass, positionsToPreserve) {
      if (!range.containsNode(ancestorWithClass)) {
        var ancestorRange = range.cloneRange();
        ancestorRange.selectNode(ancestorWithClass);
        if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
          splitNodeAt(ancestorWithClass, range.endContainer, range.endOffset, positionsToPreserve);
          range.setEndAfter(ancestorWithClass);
        }
        if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
          ancestorWithClass = splitNodeAt(ancestorWithClass, range.startContainer, range.startOffset, positionsToPreserve);
        }
      }
      if (this.isRemovable(ancestorWithClass)) {
        replaceWithOwnChildrenPreservingPositions(ancestorWithClass, positionsToPreserve);
      } else {
        removeClass(ancestorWithClass, this.className);
      }
    }, applyToRange:function(range, rangesToPreserve) {
      rangesToPreserve = rangesToPreserve || [];
      var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);
      range.splitBoundariesPreservingPositions(positionsToPreserve);
      if (this.removeEmptyElements) {
        this.removeEmptyContainers(range);
      }
      var textNodes = getEffectiveTextNodes(range);
      if (textNodes.length) {
        for (var i = 0, textNode;textNode = textNodes[i++];) {
          if (!this.isIgnorableWhiteSpaceNode(textNode) && !this.getSelfOrAncestorWithClass(textNode) && this.isModifiable(textNode)) {
            this.applyToTextNode(textNode, positionsToPreserve);
          }
        }
        textNode = textNodes[textNodes.length - 1];
        range.setStartAndEnd(textNodes[0], 0, textNode, textNode.length);
        if (this.normalize) {
          this.postApply(textNodes, range, positionsToPreserve, false);
        }
        updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
      }
    }, applyToRanges:function(ranges) {
      var i = ranges.length;
      while (i--) {
        this.applyToRange(ranges[i], ranges);
      }
      return ranges;
    }, applyToSelection:function(win) {
      var sel = api.getSelection(win);
      sel.setRanges(this.applyToRanges(sel.getAllRanges()));
    }, undoToRange:function(range, rangesToPreserve) {
      rangesToPreserve = rangesToPreserve || [];
      var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
      range.splitBoundariesPreservingPositions(positionsToPreserve);
      if (this.removeEmptyElements) {
        this.removeEmptyContainers(range, positionsToPreserve);
      }
      var textNodes = getEffectiveTextNodes(range);
      var textNode, ancestorWithClass;
      var lastTextNode = textNodes[textNodes.length - 1];
      if (textNodes.length) {
        for (var i = 0, len = textNodes.length;i < len;++i) {
          textNode = textNodes[i];
          ancestorWithClass = this.getSelfOrAncestorWithClass(textNode);
          if (ancestorWithClass && this.isModifiable(textNode)) {
            this.undoToTextNode(textNode, range, ancestorWithClass, positionsToPreserve);
          }
          range.setStartAndEnd(textNodes[0], 0, lastTextNode, lastTextNode.length);
        }
        if (this.normalize) {
          this.postApply(textNodes, range, positionsToPreserve, true);
        }
        updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
      }
    }, undoToRanges:function(ranges) {
      var i = ranges.length;
      while (i--) {
        this.undoToRange(ranges[i], ranges);
      }
      return ranges;
    }, undoToSelection:function(win) {
      var sel = api.getSelection(win);
      var ranges = api.getSelection(win).getAllRanges();
      this.undoToRanges(ranges);
      sel.setRanges(ranges);
    }, isAppliedToRange:function(range) {
      if (range.collapsed || range.toString() == "") {
        return!!this.getSelfOrAncestorWithClass(range.commonAncestorContainer);
      } else {
        var textNodes = range.getNodes([3]);
        if (textNodes.length) {
          for (var i = 0, textNode;textNode = textNodes[i++];) {
            if (!this.isIgnorableWhiteSpaceNode(textNode) && rangeSelectsAnyText(range, textNode) && this.isModifiable(textNode) && !this.getSelfOrAncestorWithClass(textNode)) {
              return false;
            }
          }
        }
        return true;
      }
    }, isAppliedToRanges:function(ranges) {
      var i = ranges.length;
      if (i == 0) {
        return false;
      }
      while (i--) {
        if (!this.isAppliedToRange(ranges[i])) {
          return false;
        }
      }
      return true;
    }, isAppliedToSelection:function(win) {
      var sel = api.getSelection(win);
      return this.isAppliedToRanges(sel.getAllRanges());
    }, toggleRange:function(range) {
      if (this.isAppliedToRange(range)) {
        this.undoToRange(range);
      } else {
        this.applyToRange(range);
      }
    }, toggleSelection:function(win) {
      if (this.isAppliedToSelection(win)) {
        this.undoToSelection(win);
      } else {
        this.applyToSelection(win);
      }
    }, getElementsWithClassIntersectingRange:function(range) {
      var elements = [];
      var applier = this;
      range.getNodes([3], function(textNode) {
        var el = applier.getSelfOrAncestorWithClass(textNode);
        if (el && !contains(elements, el)) {
          elements.push(el);
        }
      });
      return elements;
    }, detach:function() {
    }};
    function createClassApplier(className, options, tagNames) {
      return new ClassApplier(className, options, tagNames);
    }
    ClassApplier.util = {hasClass:hasClass, addClass:addClass, removeClass:removeClass, hasSameClasses:haveSameClasses, replaceWithOwnChildren:replaceWithOwnChildrenPreservingPositions, elementsHaveSameNonClassAttributes:elementsHaveSameNonClassAttributes, elementHasNonClassAttributes:elementHasNonClassAttributes, splitNodeAt:splitNodeAt, isEditableElement:isEditableElement, isEditingHost:isEditingHost, isEditable:isEditable};
    api.CssClassApplier = api.ClassApplier = ClassApplier;
    api.createCssClassApplier = api.createClassApplier = createClassApplier;
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("SaveRestore", ["WrappedRange"], function(api, module) {
    var dom = api.dom;
    var markerTextChar = "\ufeff";
    function gEBI(id, doc) {
      return(doc || document).getElementById(id);
    }
    function insertRangeBoundaryMarker(range, atStart) {
      var markerId = "selectionBoundary_" + +new Date + "_" + ("" + Math.random()).slice(2);
      var markerEl;
      var doc = dom.getDocument(range.startContainer);
      var boundaryRange = range.cloneRange();
      boundaryRange.collapse(atStart);
      markerEl = doc.createElement("span");
      markerEl.id = markerId;
      markerEl.style.lineHeight = "0";
      markerEl.style.display = "none";
      markerEl.className = "rangySelectionBoundary";
      markerEl.appendChild(doc.createTextNode(markerTextChar));
      boundaryRange.insertNode(markerEl);
      return markerEl;
    }
    function setRangeBoundary(doc, range, markerId, atStart) {
      var markerEl = gEBI(markerId, doc);
      if (markerEl) {
        range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
        markerEl.parentNode.removeChild(markerEl);
      } else {
        module.warn("Marker element has been removed. Cannot restore selection.");
      }
    }
    function compareRanges(r1, r2) {
      return r2.compareBoundaryPoints(r1.START_TO_START, r1);
    }
    function saveRange(range, backward) {
      var startEl, endEl, doc = api.DomRange.getRangeDocument(range), text = range.toString();
      if (range.collapsed) {
        endEl = insertRangeBoundaryMarker(range, false);
        return{document:doc, markerId:endEl.id, collapsed:true};
      } else {
        endEl = insertRangeBoundaryMarker(range, false);
        startEl = insertRangeBoundaryMarker(range, true);
        return{document:doc, startMarkerId:startEl.id, endMarkerId:endEl.id, collapsed:false, backward:backward, toString:function() {
          return "original text: '" + text + "', new text: '" + range.toString() + "'";
        }};
      }
    }
    function restoreRange(rangeInfo, normalize) {
      var doc = rangeInfo.document;
      if (typeof normalize == "undefined") {
        normalize = true;
      }
      var range = api.createRange(doc);
      if (rangeInfo.collapsed) {
        var markerEl = gEBI(rangeInfo.markerId, doc);
        if (markerEl) {
          markerEl.style.display = "inline";
          var previousNode = markerEl.previousSibling;
          if (previousNode && previousNode.nodeType == 3) {
            markerEl.parentNode.removeChild(markerEl);
            range.collapseToPoint(previousNode, previousNode.length);
          } else {
            range.collapseBefore(markerEl);
            markerEl.parentNode.removeChild(markerEl);
          }
        } else {
          module.warn("Marker element has been removed. Cannot restore selection.");
        }
      } else {
        setRangeBoundary(doc, range, rangeInfo.startMarkerId, true);
        setRangeBoundary(doc, range, rangeInfo.endMarkerId, false);
      }
      if (normalize) {
        range.normalizeBoundaries();
      }
      return range;
    }
    function saveRanges(ranges, backward) {
      var rangeInfos = [], range, doc;
      ranges = ranges.slice(0);
      ranges.sort(compareRanges);
      for (var i = 0, len = ranges.length;i < len;++i) {
        rangeInfos[i] = saveRange(ranges[i], backward);
      }
      for (i = len - 1;i >= 0;--i) {
        range = ranges[i];
        doc = api.DomRange.getRangeDocument(range);
        if (range.collapsed) {
          range.collapseAfter(gEBI(rangeInfos[i].markerId, doc));
        } else {
          range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
          range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
        }
      }
      return rangeInfos;
    }
    function saveSelection(win) {
      if (!api.isSelectionValid(win)) {
        module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
        return null;
      }
      var sel = api.getSelection(win);
      var ranges = sel.getAllRanges();
      var backward = ranges.length == 1 && sel.isBackward();
      var rangeInfos = saveRanges(ranges, backward);
      if (backward) {
        sel.setSingleRange(ranges[0], "backward");
      } else {
        sel.setRanges(ranges);
      }
      return{win:win, rangeInfos:rangeInfos, restored:false};
    }
    function restoreRanges(rangeInfos) {
      var ranges = [];
      var rangeCount = rangeInfos.length;
      for (var i = rangeCount - 1;i >= 0;i--) {
        ranges[i] = restoreRange(rangeInfos[i], true);
      }
      return ranges;
    }
    function restoreSelection(savedSelection, preserveDirection) {
      if (!savedSelection.restored) {
        var rangeInfos = savedSelection.rangeInfos;
        var sel = api.getSelection(savedSelection.win);
        var ranges = restoreRanges(rangeInfos), rangeCount = rangeInfos.length;
        if (rangeCount == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backward) {
          sel.removeAllRanges();
          sel.addRange(ranges[0], true);
        } else {
          sel.setRanges(ranges);
        }
        savedSelection.restored = true;
      }
    }
    function removeMarkerElement(doc, markerId) {
      var markerEl = gEBI(markerId, doc);
      if (markerEl) {
        markerEl.parentNode.removeChild(markerEl);
      }
    }
    function removeMarkers(savedSelection) {
      var rangeInfos = savedSelection.rangeInfos;
      for (var i = 0, len = rangeInfos.length, rangeInfo;i < len;++i) {
        rangeInfo = rangeInfos[i];
        if (rangeInfo.collapsed) {
          removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
        } else {
          removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
          removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
        }
      }
    }
    api.util.extend(api, {saveRange:saveRange, restoreRange:restoreRange, saveRanges:saveRanges, restoreRanges:restoreRanges, saveSelection:saveSelection, restoreSelection:restoreSelection, removeMarkerElement:removeMarkerElement, removeMarkers:removeMarkers});
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("Serializer", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";
    if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
      module.fail("encodeURIComponent and/or decodeURIComponent method is missing");
    }
    var crc32 = function() {
      function utf8encode(str) {
        var utf8CharCodes = [];
        for (var i = 0, len = str.length, c;i < len;++i) {
          c = str.charCodeAt(i);
          if (c < 128) {
            utf8CharCodes.push(c);
          } else {
            if (c < 2048) {
              utf8CharCodes.push(c >> 6 | 192, c & 63 | 128);
            } else {
              utf8CharCodes.push(c >> 12 | 224, c >> 6 & 63 | 128, c & 63 | 128);
            }
          }
        }
        return utf8CharCodes;
      }
      var cachedCrcTable = null;
      function buildCRCTable() {
        var table = [];
        for (var i = 0, j, crc;i < 256;++i) {
          crc = i;
          j = 8;
          while (j--) {
            if ((crc & 1) == 1) {
              crc = crc >>> 1 ^ 3988292384;
            } else {
              crc >>>= 1;
            }
          }
          table[i] = crc >>> 0;
        }
        return table;
      }
      function getCrcTable() {
        if (!cachedCrcTable) {
          cachedCrcTable = buildCRCTable();
        }
        return cachedCrcTable;
      }
      return function(str) {
        var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
        for (var i = 0, len = utf8CharCodes.length, y;i < len;++i) {
          y = (crc ^ utf8CharCodes[i]) & 255;
          crc = crc >>> 8 ^ crcTable[y];
        }
        return(crc ^ -1) >>> 0;
      };
    }();
    var dom = api.dom;
    function escapeTextForHtml(str) {
      return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function nodeToInfoString(node, infoParts) {
      infoParts = infoParts || [];
      var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
      var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
      var start = "", end = "";
      switch(nodeType) {
        case 3:
          start = escapeTextForHtml(node.nodeValue);
          break;
        case 8:
          start = "\x3c!--" + escapeTextForHtml(node.nodeValue) + "--\x3e";
          break;
        default:
          start = "<" + nodeInfo + ">";
          end = "</>";
          break;
      }
      if (start) {
        infoParts.push(start);
      }
      for (var i = 0;i < childCount;++i) {
        nodeToInfoString(children[i], infoParts);
      }
      if (end) {
        infoParts.push(end);
      }
      return infoParts;
    }
    function getElementChecksum(el) {
      var info = nodeToInfoString(el).join("");
      return crc32(info).toString(16);
    }
    function serializePosition(node, offset, rootNode) {
      var pathParts = [], n = node;
      rootNode = rootNode || dom.getDocument(node).documentElement;
      while (n && n != rootNode) {
        pathParts.push(dom.getNodeIndex(n, true));
        n = n.parentNode;
      }
      return pathParts.join("/") + ":" + offset;
    }
    function deserializePosition(serialized, rootNode, doc) {
      if (!rootNode) {
        rootNode = (doc || document).documentElement;
      }
      var parts = serialized.split(":");
      var node = rootNode;
      var nodeIndices = parts[0] ? parts[0].split("/") : [], i = nodeIndices.length, nodeIndex;
      while (i--) {
        nodeIndex = parseInt(nodeIndices[i], 10);
        if (nodeIndex < node.childNodes.length) {
          node = node.childNodes[nodeIndex];
        } else {
          throw module.createError("deserializePosition() failed: node " + dom.inspectNode(node) + " has no child with index " + nodeIndex + ", " + i);
        }
      }
      return new dom.DomPosition(node, parseInt(parts[1], 10));
    }
    function serializeRange(range, omitChecksum, rootNode) {
      rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
      if (!dom.isOrIsAncestorOf(rootNode, range.commonAncestorContainer)) {
        throw module.createError("serializeRange(): range " + range.inspect() + " is not wholly contained within specified root node " + dom.inspectNode(rootNode));
      }
      var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," + serializePosition(range.endContainer, range.endOffset, rootNode);
      if (!omitChecksum) {
        serialized += "{" + getElementChecksum(rootNode) + "}";
      }
      return serialized;
    }
    var deserializeRegex = /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/;
    function deserializeRange(serialized, rootNode, doc) {
      if (rootNode) {
        doc = doc || dom.getDocument(rootNode);
      } else {
        doc = doc || document;
        rootNode = doc.documentElement;
      }
      var result = deserializeRegex.exec(serialized);
      var checksum = result[4];
      if (checksum) {
        var rootNodeChecksum = getElementChecksum(rootNode);
        if (checksum !== rootNodeChecksum) {
          throw module.createError("deserializeRange(): checksums of serialized range root node (" + checksum + ") and target root node (" + rootNodeChecksum + ") do not match");
        }
      }
      var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
      var range = api.createRange(doc);
      range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
      return range;
    }
    function canDeserializeRange(serialized, rootNode, doc) {
      if (!rootNode) {
        rootNode = (doc || document).documentElement;
      }
      var result = deserializeRegex.exec(serialized);
      var checksum = result[3];
      return!checksum || checksum === getElementChecksum(rootNode);
    }
    function serializeSelection(selection, omitChecksum, rootNode) {
      selection = api.getSelection(selection);
      var ranges = selection.getAllRanges(), serializedRanges = [];
      for (var i = 0, len = ranges.length;i < len;++i) {
        serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
      }
      return serializedRanges.join("|");
    }
    function deserializeSelection(serialized, rootNode, win) {
      if (rootNode) {
        win = win || dom.getWindow(rootNode);
      } else {
        win = win || window;
        rootNode = win.document.documentElement;
      }
      var serializedRanges = serialized.split("|");
      var sel = api.getSelection(win);
      var ranges = [];
      for (var i = 0, len = serializedRanges.length;i < len;++i) {
        ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
      }
      sel.setRanges(ranges);
      return sel;
    }
    function canDeserializeSelection(serialized, rootNode, win) {
      var doc;
      if (rootNode) {
        doc = win ? win.document : dom.getDocument(rootNode);
      } else {
        win = win || window;
        rootNode = win.document.documentElement;
      }
      var serializedRanges = serialized.split("|");
      for (var i = 0, len = serializedRanges.length;i < len;++i) {
        if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
          return false;
        }
      }
      return true;
    }
    var cookieName = "rangySerializedSelection";
    function getSerializedSelectionFromCookie(cookie) {
      var parts = cookie.split(/[;,]/);
      for (var i = 0, len = parts.length, nameVal, val;i < len;++i) {
        nameVal = parts[i].split("=");
        if (nameVal[0].replace(/^\s+/, "") == cookieName) {
          val = nameVal[1];
          if (val) {
            return decodeURIComponent(val.replace(/\s+$/, ""));
          }
        }
      }
      return null;
    }
    function restoreSelectionFromCookie(win) {
      win = win || window;
      var serialized = getSerializedSelectionFromCookie(win.document.cookie);
      if (serialized) {
        deserializeSelection(serialized, win.doc);
      }
    }
    function saveSelectionCookie(win, props) {
      win = win || window;
      props = typeof props == "object" ? props : {};
      var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
      var path = props.path ? ";path=" + props.path : "";
      var domain = props.domain ? ";domain=" + props.domain : "";
      var secure = props.secure ? ";secure" : "";
      var serialized = serializeSelection(api.getSelection(win));
      win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
    }
    api.serializePosition = serializePosition;
    api.deserializePosition = deserializePosition;
    api.serializeRange = serializeRange;
    api.deserializeRange = deserializeRange;
    api.canDeserializeRange = canDeserializeRange;
    api.serializeSelection = serializeSelection;
    api.deserializeSelection = deserializeSelection;
    api.canDeserializeSelection = canDeserializeSelection;
    api.restoreSelectionFromCookie = restoreSelectionFromCookie;
    api.saveSelectionCookie = saveSelectionCookie;
    api.getElementChecksum = getElementChecksum;
    api.nodeToInfoString = nodeToInfoString;
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("Highlighter", ["ClassApplier"], function(api, module) {
    var dom = api.dom;
    var contains = dom.arrayContains;
    var getBody = dom.getBody;
    var createOptions = api.util.createOptions;
    function compareHighlights(h1, h2) {
      return h1.characterRange.start - h2.characterRange.start;
    }
    var forEach = [].forEach ? function(arr, func) {
      arr.forEach(func);
    } : function(arr, func) {
      for (var i = 0, len = arr.length;i < len;++i) {
        func(arr[i]);
      }
    };
    var nextHighlightId = 1;
    var highlighterTypes = {};
    function HighlighterType(type, converterCreator) {
      this.type = type;
      this.converterCreator = converterCreator;
    }
    HighlighterType.prototype.create = function() {
      var converter = this.converterCreator();
      converter.type = this.type;
      return converter;
    };
    function registerHighlighterType(type, converterCreator) {
      highlighterTypes[type] = new HighlighterType(type, converterCreator);
    }
    function getConverter(type) {
      var highlighterType = highlighterTypes[type];
      if (highlighterType instanceof HighlighterType) {
        return highlighterType.create();
      } else {
        throw new Error("Highlighter type '" + type + "' is not valid");
      }
    }
    api.registerHighlighterType = registerHighlighterType;
    function CharacterRange(start, end) {
      this.start = start;
      this.end = end;
    }
    CharacterRange.prototype = {intersects:function(charRange) {
      return this.start < charRange.end && this.end > charRange.start;
    }, isContiguousWith:function(charRange) {
      return this.start == charRange.end || this.end == charRange.start;
    }, union:function(charRange) {
      return new CharacterRange(Math.min(this.start, charRange.start), Math.max(this.end, charRange.end));
    }, intersection:function(charRange) {
      return new CharacterRange(Math.max(this.start, charRange.start), Math.min(this.end, charRange.end));
    }, getComplements:function(charRange) {
      var ranges = [];
      if (this.start >= charRange.start) {
        if (this.end <= charRange.end) {
          return[];
        }
        ranges.push(new CharacterRange(charRange.end, this.end));
      } else {
        ranges.push(new CharacterRange(this.start, Math.min(this.end, charRange.start)));
        if (this.end > charRange.end) {
          ranges.push(new CharacterRange(charRange.end, this.end));
        }
      }
      return ranges;
    }, toString:function() {
      return "[CharacterRange(" + this.start + ", " + this.end + ")]";
    }};
    CharacterRange.fromCharacterRange = function(charRange) {
      return new CharacterRange(charRange.start, charRange.end);
    };
    var textContentConverter = {rangeToCharacterRange:function(range, containerNode) {
      var bookmark = range.getBookmark(containerNode);
      return new CharacterRange(bookmark.start, bookmark.end);
    }, characterRangeToRange:function(doc, characterRange, containerNode) {
      var range = api.createRange(doc);
      range.moveToBookmark({start:characterRange.start, end:characterRange.end, containerNode:containerNode});
      return range;
    }, serializeSelection:function(selection, containerNode) {
      var ranges = selection.getAllRanges(), rangeCount = ranges.length;
      var rangeInfos = [];
      var backward = rangeCount == 1 && selection.isBackward();
      for (var i = 0, len = ranges.length;i < len;++i) {
        rangeInfos[i] = {characterRange:this.rangeToCharacterRange(ranges[i], containerNode), backward:backward};
      }
      return rangeInfos;
    }, restoreSelection:function(selection, savedSelection, containerNode) {
      selection.removeAllRanges();
      var doc = selection.win.document;
      for (var i = 0, len = savedSelection.length, range, rangeInfo, characterRange;i < len;++i) {
        rangeInfo = savedSelection[i];
        characterRange = rangeInfo.characterRange;
        range = this.characterRangeToRange(doc, rangeInfo.characterRange, containerNode);
        selection.addRange(range, rangeInfo.backward);
      }
    }};
    registerHighlighterType("textContent", function() {
      return textContentConverter;
    });
    registerHighlighterType("TextRange", function() {
      var converter;
      return function() {
        if (!converter) {
          var textRangeModule = api.modules.TextRange;
          if (!textRangeModule) {
            throw new Error("TextRange module is missing.");
          } else {
            if (!textRangeModule.supported) {
              throw new Error("TextRange module is present but not supported.");
            }
          }
          converter = {rangeToCharacterRange:function(range, containerNode) {
            return CharacterRange.fromCharacterRange(range.toCharacterRange(containerNode));
          }, characterRangeToRange:function(doc, characterRange, containerNode) {
            var range = api.createRange(doc);
            range.selectCharacters(containerNode, characterRange.start, characterRange.end);
            return range;
          }, serializeSelection:function(selection, containerNode) {
            return selection.saveCharacterRanges(containerNode);
          }, restoreSelection:function(selection, savedSelection, containerNode) {
            selection.restoreCharacterRanges(containerNode, savedSelection);
          }};
        }
        return converter;
      };
    }());
    function Highlight(doc, characterRange, classApplier, converter, id, containerElementId) {
      if (id) {
        this.id = id;
        nextHighlightId = Math.max(nextHighlightId, id + 1);
      } else {
        this.id = nextHighlightId++;
      }
      this.characterRange = characterRange;
      this.doc = doc;
      this.classApplier = classApplier;
      this.converter = converter;
      this.containerElementId = containerElementId || null;
      this.applied = false;
    }
    Highlight.prototype = {getContainerElement:function() {
      return this.containerElementId ? this.doc.getElementById(this.containerElementId) : getBody(this.doc);
    }, getRange:function() {
      return this.converter.characterRangeToRange(this.doc, this.characterRange, this.getContainerElement());
    }, fromRange:function(range) {
      this.characterRange = this.converter.rangeToCharacterRange(range, this.getContainerElement());
    }, getText:function() {
      return this.getRange().toString();
    }, containsElement:function(el) {
      return this.getRange().containsNodeContents(el.firstChild);
    }, unapply:function() {
      this.classApplier.undoToRange(this.getRange());
      this.applied = false;
    }, apply:function() {
      this.classApplier.applyToRange(this.getRange());
      this.applied = true;
    }, getHighlightElements:function() {
      return this.classApplier.getElementsWithClassIntersectingRange(this.getRange());
    }, toString:function() {
      return "[Highlight(ID: " + this.id + ", class: " + this.classApplier.className + ", character range: " + this.characterRange.start + " - " + this.characterRange.end + ")]";
    }};
    function Highlighter(doc, type) {
      type = type || "textContent";
      this.doc = doc || document;
      this.classAppliers = {};
      this.highlights = [];
      this.converter = getConverter(type);
    }
    Highlighter.prototype = {addClassApplier:function(classApplier) {
      this.classAppliers[classApplier.className] = classApplier;
    }, getHighlightForElement:function(el) {
      var highlights = this.highlights;
      for (var i = 0, len = highlights.length;i < len;++i) {
        if (highlights[i].containsElement(el)) {
          return highlights[i];
        }
      }
      return null;
    }, removeHighlights:function(highlights) {
      for (var i = 0, len = this.highlights.length, highlight;i < len;++i) {
        highlight = this.highlights[i];
        if (contains(highlights, highlight)) {
          highlight.unapply();
          this.highlights.splice(i--, 1);
        }
      }
    }, removeAllHighlights:function() {
      this.removeHighlights(this.highlights);
    }, getIntersectingHighlights:function(ranges) {
      var intersectingHighlights = [], highlights = this.highlights, converter = this.converter;
      forEach(ranges, function(range) {
        forEach(highlights, function(highlight) {
          if (range.intersectsRange(highlight.getRange()) && !contains(intersectingHighlights, highlight)) {
            intersectingHighlights.push(highlight);
          }
        });
      });
      return intersectingHighlights;
    }, highlightCharacterRanges:function(className, charRanges, options) {
      var i, len, j;
      var highlights = this.highlights;
      var converter = this.converter;
      var doc = this.doc;
      var highlightsToRemove = [];
      var classApplier = className ? this.classAppliers[className] : null;
      options = createOptions(options, {containerElementId:null, exclusive:true});
      var containerElementId = options.containerElementId;
      var exclusive = options.exclusive;
      var containerElement, containerElementRange, containerElementCharRange;
      if (containerElementId) {
        containerElement = this.doc.getElementById(containerElementId);
        if (containerElement) {
          containerElementRange = api.createRange(this.doc);
          containerElementRange.selectNodeContents(containerElement);
          containerElementCharRange = new CharacterRange(0, containerElementRange.toString().length);
        }
      }
      var charRange, highlightCharRange, removeHighlight, isSameClassApplier, highlightsToKeep, splitHighlight;
      for (i = 0, len = charRanges.length;i < len;++i) {
        charRange = charRanges[i];
        highlightsToKeep = [];
        if (containerElementCharRange) {
          charRange = charRange.intersection(containerElementCharRange);
        }
        if (charRange.start == charRange.end) {
          continue;
        }
        for (j = 0;j < highlights.length;++j) {
          removeHighlight = false;
          if (containerElementId == highlights[j].containerElementId) {
            highlightCharRange = highlights[j].characterRange;
            isSameClassApplier = classApplier == highlights[j].classApplier;
            splitHighlight = !isSameClassApplier && exclusive;
            if ((highlightCharRange.intersects(charRange) || highlightCharRange.isContiguousWith(charRange)) && (isSameClassApplier || splitHighlight)) {
              if (splitHighlight) {
                forEach(highlightCharRange.getComplements(charRange), function(rangeToAdd) {
                  highlightsToKeep.push(new Highlight(doc, rangeToAdd, highlights[j].classApplier, converter, null, containerElementId));
                });
              }
              removeHighlight = true;
              if (isSameClassApplier) {
                charRange = highlightCharRange.union(charRange);
              }
            }
          }
          if (removeHighlight) {
            highlightsToRemove.push(highlights[j]);
            highlights[j] = new Highlight(doc, highlightCharRange.union(charRange), classApplier, converter, null, containerElementId);
          } else {
            highlightsToKeep.push(highlights[j]);
          }
        }
        if (classApplier) {
          highlightsToKeep.push(new Highlight(doc, charRange, classApplier, converter, null, containerElementId));
        }
        this.highlights = highlights = highlightsToKeep;
      }
      forEach(highlightsToRemove, function(highlightToRemove) {
        highlightToRemove.unapply();
      });
      var newHighlights = [];
      forEach(highlights, function(highlight) {
        if (!highlight.applied) {
          highlight.apply();
          newHighlights.push(highlight);
        }
      });
      return newHighlights;
    }, highlightRanges:function(className, ranges, options) {
      var selCharRanges = [];
      var converter = this.converter;
      options = createOptions(options, {containerElement:null, exclusive:true});
      var containerElement = options.containerElement;
      var containerElementId = containerElement ? containerElement.id : null;
      var containerElementRange;
      if (containerElement) {
        containerElementRange = api.createRange(containerElement);
        containerElementRange.selectNodeContents(containerElement);
      }
      forEach(ranges, function(range) {
        var scopedRange = containerElement ? containerElementRange.intersection(range) : range;
        selCharRanges.push(converter.rangeToCharacterRange(scopedRange, containerElement || getBody(range.getDocument())));
      });
      return this.highlightCharacterRanges(className, selCharRanges, {containerElementId:containerElementId, exclusive:options.exclusive});
    }, highlightSelection:function(className, options) {
      var converter = this.converter;
      var classApplier = className ? this.classAppliers[className] : false;
      options = createOptions(options, {containerElementId:null, selection:api.getSelection(), exclusive:true});
      var containerElementId = options.containerElementId;
      var exclusive = options.exclusive;
      var selection = options.selection;
      var doc = selection.win.document;
      var containerElement = containerElementId ? doc.getElementById(containerElementId) : getBody(doc);
      if (!classApplier && className !== false) {
        throw new Error("No class applier found for class '" + className + "'");
      }
      var serializedSelection = converter.serializeSelection(selection, containerElement);
      var selCharRanges = [];
      forEach(serializedSelection, function(rangeInfo) {
        selCharRanges.push(CharacterRange.fromCharacterRange(rangeInfo.characterRange));
      });
      var newHighlights = this.highlightCharacterRanges(className, selCharRanges, {containerElementId:containerElementId, exclusive:exclusive});
      converter.restoreSelection(selection, serializedSelection, containerElement);
      return newHighlights;
    }, unhighlightSelection:function(selection) {
      selection = selection || api.getSelection();
      var intersectingHighlights = this.getIntersectingHighlights(selection.getAllRanges());
      this.removeHighlights(intersectingHighlights);
      selection.removeAllRanges();
      return intersectingHighlights;
    }, getHighlightsInSelection:function(selection) {
      selection = selection || api.getSelection();
      return this.getIntersectingHighlights(selection.getAllRanges());
    }, selectionOverlapsHighlight:function(selection) {
      return this.getHighlightsInSelection(selection).length > 0;
    }, serialize:function(options) {
      var highlights = this.highlights;
      highlights.sort(compareHighlights);
      var serializedHighlights = ["type:" + this.converter.type];
      options = createOptions(options, {serializeHighlightText:false});
      forEach(highlights, function(highlight) {
        var characterRange = highlight.characterRange;
        var parts = [characterRange.start, characterRange.end, highlight.id, highlight.classApplier.className, highlight.containerElementId];
        if (options.serializeHighlightText) {
          parts.push(highlight.getText());
        }
        serializedHighlights.push(parts.join("$"));
      });
      return serializedHighlights.join("|");
    }, deserialize:function(serialized) {
      var serializedHighlights = serialized.split("|");
      var highlights = [];
      var firstHighlight = serializedHighlights[0];
      var regexResult;
      var serializationType, serializationConverter, convertType = false;
      if (firstHighlight && (regexResult = /^type:(\w+)$/.exec(firstHighlight))) {
        serializationType = regexResult[1];
        if (serializationType != this.converter.type) {
          serializationConverter = getConverter(serializationType);
          convertType = true;
        }
        serializedHighlights.shift();
      } else {
        throw new Error("Serialized highlights are invalid.");
      }
      var classApplier, highlight, characterRange, containerElementId, containerElement;
      for (var i = serializedHighlights.length, parts;i-- > 0;) {
        parts = serializedHighlights[i].split("$");
        characterRange = new CharacterRange(+parts[0], +parts[1]);
        containerElementId = parts[4] || null;
        containerElement = containerElementId ? this.doc.getElementById(containerElementId) : getBody(this.doc);
        if (convertType) {
          characterRange = this.converter.rangeToCharacterRange(serializationConverter.characterRangeToRange(this.doc, characterRange, containerElement), containerElement);
        }
        classApplier = this.classAppliers[parts[3]];
        if (!classApplier) {
          throw new Error("No class applier found for class '" + parts[3] + "'");
        }
        highlight = new Highlight(this.doc, characterRange, classApplier, this.converter, parseInt(parts[2]), containerElementId);
        highlight.apply();
        highlights.push(highlight);
      }
      this.highlights = highlights;
    }};
    api.Highlighter = Highlighter;
    api.createHighlighter = function(doc, rangeCharacterOffsetConverterType) {
      return new Highlighter(doc, rangeCharacterOffsetConverterType);
    };
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("TextRange", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";
    var CHARACTER = "character", WORD = "word";
    var dom = api.dom, util = api.util;
    var extend = util.extend;
    var createOptions = util.createOptions;
    var getBody = dom.getBody;
    var spacesRegex = /^[ \t\f\r\n]+$/;
    var spacesMinusLineBreaksRegex = /^[ \t\f\r]+$/;
    var allWhiteSpaceRegex = /^[\t-\r \u0085\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+$/;
    var nonLineBreakWhiteSpaceRegex = /^[\t \u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]+$/;
    var lineBreakRegex = /^[\n-\r\u0085\u2028\u2029]$/;
    var defaultLanguage = "en";
    var isDirectionBackward = api.Selection.isDirectionBackward;
    var trailingSpaceInBlockCollapses = false;
    var trailingSpaceBeforeBrCollapses = false;
    var trailingSpaceBeforeBlockCollapses = false;
    var trailingSpaceBeforeLineBreakInPreLineCollapses = true;
    (function() {
      var el = document.createElement("div");
      el.contentEditable = "true";
      el.innerHTML = "<p>1 </p><p></p>";
      var body = getBody(document);
      var p = el.firstChild;
      var sel = api.getSelection();
      body.appendChild(el);
      sel.collapse(p.lastChild, 2);
      sel.setStart(p.firstChild, 0);
      trailingSpaceInBlockCollapses = ("" + sel).length == 1;
      el.innerHTML = "1 <br />";
      sel.collapse(el, 2);
      sel.setStart(el.firstChild, 0);
      trailingSpaceBeforeBrCollapses = ("" + sel).length == 1;
      el.innerHTML = "1 <p>1</p>";
      sel.collapse(el, 2);
      sel.setStart(el.firstChild, 0);
      trailingSpaceBeforeBlockCollapses = ("" + sel).length == 1;
      body.removeChild(el);
      sel.removeAllRanges();
    })();
    function defaultTokenizer(chars, wordOptions) {
      var word = chars.join(""), result, tokens = [];
      function createTokenFromRange(start, end, isWord) {
        var tokenChars = chars.slice(start, end);
        var token = {isWord:isWord, chars:tokenChars, toString:function() {
          return tokenChars.join("");
        }};
        for (var i = 0, len = tokenChars.length;i < len;++i) {
          tokenChars[i].token = token;
        }
        tokens.push(token);
      }
      var lastWordEnd = 0, wordStart, wordEnd;
      while (result = wordOptions.wordRegex.exec(word)) {
        wordStart = result.index;
        wordEnd = wordStart + result[0].length;
        if (wordStart > lastWordEnd) {
          createTokenFromRange(lastWordEnd, wordStart, false);
        }
        if (wordOptions.includeTrailingSpace) {
          while (nonLineBreakWhiteSpaceRegex.test(chars[wordEnd])) {
            ++wordEnd;
          }
        }
        createTokenFromRange(wordStart, wordEnd, true);
        lastWordEnd = wordEnd;
      }
      if (lastWordEnd < chars.length) {
        createTokenFromRange(lastWordEnd, chars.length, false);
      }
      return tokens;
    }
    var defaultCharacterOptions = {includeBlockContentTrailingSpace:true, includeSpaceBeforeBr:true, includeSpaceBeforeBlock:true, includePreLineTrailingSpace:true, ignoreCharacters:""};
    function normalizeIgnoredCharacters(ignoredCharacters) {
      var ignoredChars = ignoredCharacters || "";
      var ignoredCharsArray = typeof ignoredChars == "string" ? ignoredChars.split("") : ignoredChars;
      ignoredCharsArray.sort(function(char1, char2) {
        return char1.charCodeAt(0) - char2.charCodeAt(0);
      });
      return ignoredCharsArray.join("").replace(/(.)\1+/g, "$1");
    }
    var defaultCaretCharacterOptions = {includeBlockContentTrailingSpace:!trailingSpaceBeforeLineBreakInPreLineCollapses, includeSpaceBeforeBr:!trailingSpaceBeforeBrCollapses, includeSpaceBeforeBlock:!trailingSpaceBeforeBlockCollapses, includePreLineTrailingSpace:true};
    var defaultWordOptions = {"en":{wordRegex:/[a-z0-9]+('[a-z0-9]+)*/gi, includeTrailingSpace:false, tokenizer:defaultTokenizer}};
    var defaultFindOptions = {caseSensitive:false, withinRange:null, wholeWordsOnly:false, wrap:false, direction:"forward", wordOptions:null, characterOptions:null};
    var defaultMoveOptions = {wordOptions:null, characterOptions:null};
    var defaultExpandOptions = {wordOptions:null, characterOptions:null, trim:false, trimStart:true, trimEnd:true};
    var defaultWordIteratorOptions = {wordOptions:null, characterOptions:null, direction:"forward"};
    function createWordOptions(options) {
      var lang, defaults;
      if (!options) {
        return defaultWordOptions[defaultLanguage];
      } else {
        lang = options.language || defaultLanguage;
        defaults = {};
        extend(defaults, defaultWordOptions[lang] || defaultWordOptions[defaultLanguage]);
        extend(defaults, options);
        return defaults;
      }
    }
    function createNestedOptions(optionsParam, defaults) {
      var options = createOptions(optionsParam, defaults);
      if (defaults.hasOwnProperty("wordOptions")) {
        options.wordOptions = createWordOptions(options.wordOptions);
      }
      if (defaults.hasOwnProperty("characterOptions")) {
        options.characterOptions = createOptions(options.characterOptions, defaultCharacterOptions);
      }
      return options;
    }
    var getComputedStyleProperty = dom.getComputedStyleProperty;
    var tableCssDisplayBlock;
    (function() {
      var table = document.createElement("table");
      var body = getBody(document);
      body.appendChild(table);
      tableCssDisplayBlock = getComputedStyleProperty(table, "display") == "block";
      body.removeChild(table);
    })();
    api.features.tableCssDisplayBlock = tableCssDisplayBlock;
    var defaultDisplayValueForTag = {table:"table", caption:"table-caption", colgroup:"table-column-group", col:"table-column", thead:"table-header-group", tbody:"table-row-group", tfoot:"table-footer-group", tr:"table-row", td:"table-cell", th:"table-cell"};
    function getComputedDisplay(el, win) {
      var display = getComputedStyleProperty(el, "display", win);
      var tagName = el.tagName.toLowerCase();
      return display == "block" && tableCssDisplayBlock && defaultDisplayValueForTag.hasOwnProperty(tagName) ? defaultDisplayValueForTag[tagName] : display;
    }
    function isHidden(node) {
      var ancestors = getAncestorsAndSelf(node);
      for (var i = 0, len = ancestors.length;i < len;++i) {
        if (ancestors[i].nodeType == 1 && getComputedDisplay(ancestors[i]) == "none") {
          return true;
        }
      }
      return false;
    }
    function isVisibilityHiddenTextNode(textNode) {
      var el;
      return textNode.nodeType == 3 && (el = textNode.parentNode) && getComputedStyleProperty(el, "visibility") == "hidden";
    }
    function isBlockNode(node) {
      return node && (node.nodeType == 1 && !/^(inline(-block|-table)?|none)$/.test(getComputedDisplay(node)) || node.nodeType == 9 || node.nodeType == 11);
    }
    function getLastDescendantOrSelf(node) {
      var lastChild = node.lastChild;
      return lastChild ? getLastDescendantOrSelf(lastChild) : node;
    }
    function containsPositions(node) {
      return dom.isCharacterDataNode(node) || !/^(area|base|basefont|br|col|frame|hr|img|input|isindex|link|meta|param)$/i.test(node.nodeName);
    }
    function getAncestors(node) {
      var ancestors = [];
      while (node.parentNode) {
        ancestors.unshift(node.parentNode);
        node = node.parentNode;
      }
      return ancestors;
    }
    function getAncestorsAndSelf(node) {
      return getAncestors(node).concat([node]);
    }
    function nextNodeDescendants(node) {
      while (node && !node.nextSibling) {
        node = node.parentNode;
      }
      if (!node) {
        return null;
      }
      return node.nextSibling;
    }
    function nextNode(node, excludeChildren) {
      if (!excludeChildren && node.hasChildNodes()) {
        return node.firstChild;
      }
      return nextNodeDescendants(node);
    }
    function previousNode(node) {
      var previous = node.previousSibling;
      if (previous) {
        node = previous;
        while (node.hasChildNodes()) {
          node = node.lastChild;
        }
        return node;
      }
      var parent = node.parentNode;
      if (parent && parent.nodeType == 1) {
        return parent;
      }
      return null;
    }
    function isWhitespaceNode(node) {
      if (!node || node.nodeType != 3) {
        return false;
      }
      var text = node.data;
      if (text === "") {
        return true;
      }
      var parent = node.parentNode;
      if (!parent || parent.nodeType != 1) {
        return false;
      }
      var computedWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
      return/^[\t\n\r ]+$/.test(text) && /^(normal|nowrap)$/.test(computedWhiteSpace) || /^[\t\r ]+$/.test(text) && computedWhiteSpace == "pre-line";
    }
    function isCollapsedWhitespaceNode(node) {
      if (node.data === "") {
        return true;
      }
      if (!isWhitespaceNode(node)) {
        return false;
      }
      var ancestor = node.parentNode;
      if (!ancestor) {
        return true;
      }
      if (isHidden(node)) {
        return true;
      }
      return false;
    }
    function isCollapsedNode(node) {
      var type = node.nodeType;
      return type == 7 || type == 8 || isHidden(node) || /^(script|style)$/i.test(node.nodeName) || isVisibilityHiddenTextNode(node) || isCollapsedWhitespaceNode(node);
    }
    function isIgnoredNode(node, win) {
      var type = node.nodeType;
      return type == 7 || type == 8 || type == 1 && getComputedDisplay(node, win) == "none";
    }
    function Cache() {
      this.store = {};
    }
    Cache.prototype = {get:function(key) {
      return this.store.hasOwnProperty(key) ? this.store[key] : null;
    }, set:function(key, value) {
      return this.store[key] = value;
    }};
    var cachedCount = 0, uncachedCount = 0;
    function createCachingGetter(methodName, func, objProperty) {
      return function(args) {
        var cache = this.cache;
        if (cache.hasOwnProperty(methodName)) {
          cachedCount++;
          return cache[methodName];
        } else {
          uncachedCount++;
          var value = func.call(this, objProperty ? this[objProperty] : this, args);
          cache[methodName] = value;
          return value;
        }
      };
    }
    function NodeWrapper(node, session) {
      this.node = node;
      this.session = session;
      this.cache = new Cache;
      this.positions = new Cache;
    }
    var nodeProto = {getPosition:function(offset) {
      var positions = this.positions;
      return positions.get(offset) || positions.set(offset, new Position(this, offset));
    }, toString:function() {
      return "[NodeWrapper(" + dom.inspectNode(this.node) + ")]";
    }};
    NodeWrapper.prototype = nodeProto;
    var EMPTY = "EMPTY", NON_SPACE = "NON_SPACE", UNCOLLAPSIBLE_SPACE = "UNCOLLAPSIBLE_SPACE", COLLAPSIBLE_SPACE = "COLLAPSIBLE_SPACE", TRAILING_SPACE_BEFORE_BLOCK = "TRAILING_SPACE_BEFORE_BLOCK", TRAILING_SPACE_IN_BLOCK = "TRAILING_SPACE_IN_BLOCK", TRAILING_SPACE_BEFORE_BR = "TRAILING_SPACE_BEFORE_BR", PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK = "PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK", TRAILING_LINE_BREAK_AFTER_BR = "TRAILING_LINE_BREAK_AFTER_BR";
    extend(nodeProto, {isCharacterDataNode:createCachingGetter("isCharacterDataNode", dom.isCharacterDataNode, "node"), getNodeIndex:createCachingGetter("nodeIndex", dom.getNodeIndex, "node"), getLength:createCachingGetter("nodeLength", dom.getNodeLength, "node"), containsPositions:createCachingGetter("containsPositions", containsPositions, "node"), isWhitespace:createCachingGetter("isWhitespace", isWhitespaceNode, "node"), isCollapsedWhitespace:createCachingGetter("isCollapsedWhitespace", isCollapsedWhitespaceNode, 
    "node"), getComputedDisplay:createCachingGetter("computedDisplay", getComputedDisplay, "node"), isCollapsed:createCachingGetter("collapsed", isCollapsedNode, "node"), isIgnored:createCachingGetter("ignored", isIgnoredNode, "node"), next:createCachingGetter("nextPos", nextNode, "node"), previous:createCachingGetter("previous", previousNode, "node"), getTextNodeInfo:createCachingGetter("textNodeInfo", function(textNode) {
      var spaceRegex = null, collapseSpaces = false;
      var cssWhitespace = getComputedStyleProperty(textNode.parentNode, "whiteSpace");
      var preLine = cssWhitespace == "pre-line";
      if (preLine) {
        spaceRegex = spacesMinusLineBreaksRegex;
        collapseSpaces = true;
      } else {
        if (cssWhitespace == "normal" || cssWhitespace == "nowrap") {
          spaceRegex = spacesRegex;
          collapseSpaces = true;
        }
      }
      return{node:textNode, text:textNode.data, spaceRegex:spaceRegex, collapseSpaces:collapseSpaces, preLine:preLine};
    }, "node"), hasInnerText:createCachingGetter("hasInnerText", function(el, backward) {
      var session = this.session;
      var posAfterEl = session.getPosition(el.parentNode, this.getNodeIndex() + 1);
      var firstPosInEl = session.getPosition(el, 0);
      var pos = backward ? posAfterEl : firstPosInEl;
      var endPos = backward ? firstPosInEl : posAfterEl;
      while (pos !== endPos) {
        pos.prepopulateChar();
        if (pos.isDefinitelyNonEmpty()) {
          return true;
        }
        pos = backward ? pos.previousVisible() : pos.nextVisible();
      }
      return false;
    }, "node"), isRenderedBlock:createCachingGetter("isRenderedBlock", function(el) {
      var brs = el.getElementsByTagName("br");
      for (var i = 0, len = brs.length;i < len;++i) {
        if (!isCollapsedNode(brs[i])) {
          return true;
        }
      }
      return this.hasInnerText();
    }, "node"), getTrailingSpace:createCachingGetter("trailingSpace", function(el) {
      if (el.tagName.toLowerCase() == "br") {
        return "";
      } else {
        switch(this.getComputedDisplay()) {
          case "inline":
            var child = el.lastChild;
            while (child) {
              if (!isIgnoredNode(child)) {
                return child.nodeType == 1 ? this.session.getNodeWrapper(child).getTrailingSpace() : "";
              }
              child = child.previousSibling;
            }
            break;
          case "inline-block":
          ;
          case "inline-table":
          ;
          case "none":
          ;
          case "table-column":
          ;
          case "table-column-group":
            break;
          case "table-cell":
            return "\t";
          default:
            return this.isRenderedBlock(true) ? "\n" : "";
        }
      }
      return "";
    }, "node"), getLeadingSpace:createCachingGetter("leadingSpace", function(el) {
      switch(this.getComputedDisplay()) {
        case "inline":
        ;
        case "inline-block":
        ;
        case "inline-table":
        ;
        case "none":
        ;
        case "table-column":
        ;
        case "table-column-group":
        ;
        case "table-cell":
          break;
        default:
          return this.isRenderedBlock(false) ? "\n" : "";
      }
      return "";
    }, "node")});
    function Position(nodeWrapper, offset) {
      this.offset = offset;
      this.nodeWrapper = nodeWrapper;
      this.node = nodeWrapper.node;
      this.session = nodeWrapper.session;
      this.cache = new Cache;
    }
    function inspectPosition() {
      return "[Position(" + dom.inspectNode(this.node) + ":" + this.offset + ")]";
    }
    var positionProto = {character:"", characterType:EMPTY, isBr:false, prepopulateChar:function() {
      var pos = this;
      if (!pos.prepopulatedChar) {
        var node = pos.node, offset = pos.offset;
        var visibleChar = "", charType = EMPTY;
        var finalizedChar = false;
        if (offset > 0) {
          if (node.nodeType == 3) {
            var text = node.data;
            var textChar = text.charAt(offset - 1);
            var nodeInfo = pos.nodeWrapper.getTextNodeInfo();
            var spaceRegex = nodeInfo.spaceRegex;
            if (nodeInfo.collapseSpaces) {
              if (spaceRegex.test(textChar)) {
                if (offset > 1 && spaceRegex.test(text.charAt(offset - 2))) {
                } else {
                  if (nodeInfo.preLine && text.charAt(offset) === "\n") {
                    visibleChar = " ";
                    charType = PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK;
                  } else {
                    visibleChar = " ";
                    charType = COLLAPSIBLE_SPACE;
                  }
                }
              } else {
                visibleChar = textChar;
                charType = NON_SPACE;
                finalizedChar = true;
              }
            } else {
              visibleChar = textChar;
              charType = UNCOLLAPSIBLE_SPACE;
              finalizedChar = true;
            }
          } else {
            var nodePassed = node.childNodes[offset - 1];
            if (nodePassed && nodePassed.nodeType == 1 && !isCollapsedNode(nodePassed)) {
              if (nodePassed.tagName.toLowerCase() == "br") {
                visibleChar = "\n";
                pos.isBr = true;
                charType = COLLAPSIBLE_SPACE;
                finalizedChar = false;
              } else {
                pos.checkForTrailingSpace = true;
              }
            }
            if (!visibleChar) {
              var nextNode = node.childNodes[offset];
              if (nextNode && nextNode.nodeType == 1 && !isCollapsedNode(nextNode)) {
                pos.checkForLeadingSpace = true;
              }
            }
          }
        }
        pos.prepopulatedChar = true;
        pos.character = visibleChar;
        pos.characterType = charType;
        pos.isCharInvariant = finalizedChar;
      }
    }, isDefinitelyNonEmpty:function() {
      var charType = this.characterType;
      return charType == NON_SPACE || charType == UNCOLLAPSIBLE_SPACE;
    }, resolveLeadingAndTrailingSpaces:function() {
      if (!this.prepopulatedChar) {
        this.prepopulateChar();
      }
      if (this.checkForTrailingSpace) {
        var trailingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset - 1]).getTrailingSpace();
        if (trailingSpace) {
          this.isTrailingSpace = true;
          this.character = trailingSpace;
          this.characterType = COLLAPSIBLE_SPACE;
        }
        this.checkForTrailingSpace = false;
      }
      if (this.checkForLeadingSpace) {
        var leadingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset]).getLeadingSpace();
        if (leadingSpace) {
          this.isLeadingSpace = true;
          this.character = leadingSpace;
          this.characterType = COLLAPSIBLE_SPACE;
        }
        this.checkForLeadingSpace = false;
      }
    }, getPrecedingUncollapsedPosition:function(characterOptions) {
      var pos = this, character;
      while (pos = pos.previousVisible()) {
        character = pos.getCharacter(characterOptions);
        if (character !== "") {
          return pos;
        }
      }
      return null;
    }, getCharacter:function(characterOptions) {
      this.resolveLeadingAndTrailingSpaces();
      var thisChar = this.character, returnChar;
      var ignoredChars = normalizeIgnoredCharacters(characterOptions.ignoreCharacters);
      var isIgnoredCharacter = thisChar !== "" && ignoredChars.indexOf(thisChar) > -1;
      if (this.isCharInvariant) {
        returnChar = isIgnoredCharacter ? "" : thisChar;
        return returnChar;
      }
      var cacheKey = ["character", characterOptions.includeSpaceBeforeBr, characterOptions.includeBlockContentTrailingSpace, characterOptions.includePreLineTrailingSpace, ignoredChars].join("_");
      var cachedChar = this.cache.get(cacheKey);
      if (cachedChar !== null) {
        return cachedChar;
      }
      var character = "";
      var collapsible = this.characterType == COLLAPSIBLE_SPACE;
      var nextPos, previousPos;
      var gotPreviousPos = false;
      var pos = this;
      function getPreviousPos() {
        if (!gotPreviousPos) {
          previousPos = pos.getPrecedingUncollapsedPosition(characterOptions);
          gotPreviousPos = true;
        }
        return previousPos;
      }
      if (collapsible) {
        if (thisChar == " " && (!getPreviousPos() || previousPos.isTrailingSpace || previousPos.character == "\n")) {
        } else {
          if (thisChar == "\n" && this.isLeadingSpace) {
            if (getPreviousPos() && previousPos.character != "\n") {
              character = "\n";
            } else {
            }
          } else {
            nextPos = this.nextUncollapsed();
            if (nextPos) {
              if (nextPos.isBr) {
                this.type = TRAILING_SPACE_BEFORE_BR;
              } else {
                if (nextPos.isTrailingSpace && nextPos.character == "\n") {
                  this.type = TRAILING_SPACE_IN_BLOCK;
                } else {
                  if (nextPos.isLeadingSpace && nextPos.character == "\n") {
                    this.type = TRAILING_SPACE_BEFORE_BLOCK;
                  }
                }
              }
              if (nextPos.character == "\n") {
                if (this.type == TRAILING_SPACE_BEFORE_BR && !characterOptions.includeSpaceBeforeBr) {
                } else {
                  if (this.type == TRAILING_SPACE_BEFORE_BLOCK && !characterOptions.includeSpaceBeforeBlock) {
                  } else {
                    if (this.type == TRAILING_SPACE_IN_BLOCK && nextPos.isTrailingSpace && !characterOptions.includeBlockContentTrailingSpace) {
                    } else {
                      if (this.type == PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK && nextPos.type == NON_SPACE && !characterOptions.includePreLineTrailingSpace) {
                      } else {
                        if (thisChar == "\n") {
                          if (nextPos.isTrailingSpace) {
                            if (this.isTrailingSpace) {
                            } else {
                              if (this.isBr) {
                                nextPos.type = TRAILING_LINE_BREAK_AFTER_BR;
                                if (getPreviousPos() && previousPos.isLeadingSpace && previousPos.character == "\n") {
                                  nextPos.character = "";
                                } else {
                                }
                              }
                            }
                          } else {
                            character = "\n";
                          }
                        } else {
                          if (thisChar == " ") {
                            character = " ";
                          } else {
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                character = thisChar;
              }
            } else {
            }
          }
        }
      } else {
        if (thisChar == "\n" && (!(nextPos = this.nextUncollapsed()) || nextPos.isTrailingSpace)) {
        }
      }
      if (ignoredChars.indexOf(character) > -1) {
        character = "";
      }
      this.cache.set(cacheKey, character);
      return character;
    }, equals:function(pos) {
      return!!pos && this.node === pos.node && this.offset === pos.offset;
    }, inspect:inspectPosition, toString:function() {
      return this.character;
    }};
    Position.prototype = positionProto;
    extend(positionProto, {next:createCachingGetter("nextPos", function(pos) {
      var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
      if (!node) {
        return null;
      }
      var nextNode, nextOffset, child;
      if (offset == nodeWrapper.getLength()) {
        nextNode = node.parentNode;
        nextOffset = nextNode ? nodeWrapper.getNodeIndex() + 1 : 0;
      } else {
        if (nodeWrapper.isCharacterDataNode()) {
          nextNode = node;
          nextOffset = offset + 1;
        } else {
          child = node.childNodes[offset];
          if (session.getNodeWrapper(child).containsPositions()) {
            nextNode = child;
            nextOffset = 0;
          } else {
            nextNode = node;
            nextOffset = offset + 1;
          }
        }
      }
      return nextNode ? session.getPosition(nextNode, nextOffset) : null;
    }), previous:createCachingGetter("previous", function(pos) {
      var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
      var previousNode, previousOffset, child;
      if (offset == 0) {
        previousNode = node.parentNode;
        previousOffset = previousNode ? nodeWrapper.getNodeIndex() : 0;
      } else {
        if (nodeWrapper.isCharacterDataNode()) {
          previousNode = node;
          previousOffset = offset - 1;
        } else {
          child = node.childNodes[offset - 1];
          if (session.getNodeWrapper(child).containsPositions()) {
            previousNode = child;
            previousOffset = dom.getNodeLength(child);
          } else {
            previousNode = node;
            previousOffset = offset - 1;
          }
        }
      }
      return previousNode ? session.getPosition(previousNode, previousOffset) : null;
    }), nextVisible:createCachingGetter("nextVisible", function(pos) {
      var next = pos.next();
      if (!next) {
        return null;
      }
      var nodeWrapper = next.nodeWrapper, node = next.node;
      var newPos = next;
      if (nodeWrapper.isCollapsed()) {
        newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex() + 1);
      }
      return newPos;
    }), nextUncollapsed:createCachingGetter("nextUncollapsed", function(pos) {
      var nextPos = pos;
      while (nextPos = nextPos.nextVisible()) {
        nextPos.resolveLeadingAndTrailingSpaces();
        if (nextPos.character !== "") {
          return nextPos;
        }
      }
      return null;
    }), previousVisible:createCachingGetter("previousVisible", function(pos) {
      var previous = pos.previous();
      if (!previous) {
        return null;
      }
      var nodeWrapper = previous.nodeWrapper, node = previous.node;
      var newPos = previous;
      if (nodeWrapper.isCollapsed()) {
        newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex());
      }
      return newPos;
    })});
    var currentSession = null;
    var Session = function() {
      function createWrapperCache(nodeProperty) {
        var cache = new Cache;
        return{get:function(node) {
          var wrappersByProperty = cache.get(node[nodeProperty]);
          if (wrappersByProperty) {
            for (var i = 0, wrapper;wrapper = wrappersByProperty[i++];) {
              if (wrapper.node === node) {
                return wrapper;
              }
            }
          }
          return null;
        }, set:function(nodeWrapper) {
          var property = nodeWrapper.node[nodeProperty];
          var wrappersByProperty = cache.get(property) || cache.set(property, []);
          wrappersByProperty.push(nodeWrapper);
        }};
      }
      var uniqueIDSupported = util.isHostProperty(document.documentElement, "uniqueID");
      function Session() {
        this.initCaches();
      }
      Session.prototype = {initCaches:function() {
        this.elementCache = uniqueIDSupported ? function() {
          var elementsCache = new Cache;
          return{get:function(el) {
            return elementsCache.get(el.uniqueID);
          }, set:function(elWrapper) {
            elementsCache.set(elWrapper.node.uniqueID, elWrapper);
          }};
        }() : createWrapperCache("tagName");
        this.textNodeCache = createWrapperCache("data");
        this.otherNodeCache = createWrapperCache("nodeName");
      }, getNodeWrapper:function(node) {
        var wrapperCache;
        switch(node.nodeType) {
          case 1:
            wrapperCache = this.elementCache;
            break;
          case 3:
            wrapperCache = this.textNodeCache;
            break;
          default:
            wrapperCache = this.otherNodeCache;
            break;
        }
        var wrapper = wrapperCache.get(node);
        if (!wrapper) {
          wrapper = new NodeWrapper(node, this);
          wrapperCache.set(wrapper);
        }
        return wrapper;
      }, getPosition:function(node, offset) {
        return this.getNodeWrapper(node).getPosition(offset);
      }, getRangeBoundaryPosition:function(range, isStart) {
        var prefix = isStart ? "start" : "end";
        return this.getPosition(range[prefix + "Container"], range[prefix + "Offset"]);
      }, detach:function() {
        this.elementCache = this.textNodeCache = this.otherNodeCache = null;
      }};
      return Session;
    }();
    function startSession() {
      endSession();
      return currentSession = new Session;
    }
    function getSession() {
      return currentSession || startSession();
    }
    function endSession() {
      if (currentSession) {
        currentSession.detach();
      }
      currentSession = null;
    }
    extend(dom, {nextNode:nextNode, previousNode:previousNode});
    function createCharacterIterator(startPos, backward, endPos, characterOptions) {
      if (endPos) {
        if (backward) {
          if (isCollapsedNode(endPos.node)) {
            endPos = startPos.previousVisible();
          }
        } else {
          if (isCollapsedNode(endPos.node)) {
            endPos = endPos.nextVisible();
          }
        }
      }
      var pos = startPos, finished = false;
      function next() {
        var charPos = null;
        if (backward) {
          charPos = pos;
          if (!finished) {
            pos = pos.previousVisible();
            finished = !pos || endPos && pos.equals(endPos);
          }
        } else {
          if (!finished) {
            charPos = pos = pos.nextVisible();
            finished = !pos || endPos && pos.equals(endPos);
          }
        }
        if (finished) {
          pos = null;
        }
        return charPos;
      }
      var previousTextPos, returnPreviousTextPos = false;
      return{next:function() {
        if (returnPreviousTextPos) {
          returnPreviousTextPos = false;
          return previousTextPos;
        } else {
          var pos, character;
          while (pos = next()) {
            character = pos.getCharacter(characterOptions);
            if (character) {
              previousTextPos = pos;
              return pos;
            }
          }
          return null;
        }
      }, rewind:function() {
        if (previousTextPos) {
          returnPreviousTextPos = true;
        } else {
          throw module.createError("createCharacterIterator: cannot rewind. Only one position can be rewound.");
        }
      }, dispose:function() {
        startPos = endPos = null;
      }};
    }
    var arrayIndexOf = Array.prototype.indexOf ? function(arr, val) {
      return arr.indexOf(val);
    } : function(arr, val) {
      for (var i = 0, len = arr.length;i < len;++i) {
        if (arr[i] === val) {
          return i;
        }
      }
      return-1;
    };
    function createTokenizedTextProvider(pos, characterOptions, wordOptions) {
      var forwardIterator = createCharacterIterator(pos, false, null, characterOptions);
      var backwardIterator = createCharacterIterator(pos, true, null, characterOptions);
      var tokenizer = wordOptions.tokenizer;
      function consumeWord(forward) {
        var pos, textChar;
        var newChars = [], it = forward ? forwardIterator : backwardIterator;
        var passedWordBoundary = false, insideWord = false;
        while (pos = it.next()) {
          textChar = pos.character;
          if (allWhiteSpaceRegex.test(textChar)) {
            if (insideWord) {
              insideWord = false;
              passedWordBoundary = true;
            }
          } else {
            if (passedWordBoundary) {
              it.rewind();
              break;
            } else {
              insideWord = true;
            }
          }
          newChars.push(pos);
        }
        return newChars;
      }
      var forwardChars = consumeWord(true);
      var backwardChars = consumeWord(false).reverse();
      var tokens = tokenizer(backwardChars.concat(forwardChars), wordOptions);
      var forwardTokensBuffer = forwardChars.length ? tokens.slice(arrayIndexOf(tokens, forwardChars[0].token)) : [];
      var backwardTokensBuffer = backwardChars.length ? tokens.slice(0, arrayIndexOf(tokens, backwardChars.pop().token) + 1) : [];
      function inspectBuffer(buffer) {
        var textPositions = ["[" + buffer.length + "]"];
        for (var i = 0;i < buffer.length;++i) {
          textPositions.push("(word: " + buffer[i] + ", is word: " + buffer[i].isWord + ")");
        }
        return textPositions;
      }
      return{nextEndToken:function() {
        var lastToken, forwardChars;
        while (forwardTokensBuffer.length == 1 && !(lastToken = forwardTokensBuffer[0]).isWord && (forwardChars = consumeWord(true)).length > 0) {
          forwardTokensBuffer = tokenizer(lastToken.chars.concat(forwardChars), wordOptions);
        }
        return forwardTokensBuffer.shift();
      }, previousStartToken:function() {
        var lastToken, backwardChars;
        while (backwardTokensBuffer.length == 1 && !(lastToken = backwardTokensBuffer[0]).isWord && (backwardChars = consumeWord(false)).length > 0) {
          backwardTokensBuffer = tokenizer(backwardChars.reverse().concat(lastToken.chars), wordOptions);
        }
        return backwardTokensBuffer.pop();
      }, dispose:function() {
        forwardIterator.dispose();
        backwardIterator.dispose();
        forwardTokensBuffer = backwardTokensBuffer = null;
      }};
    }
    function movePositionBy(pos, unit, count, characterOptions, wordOptions) {
      var unitsMoved = 0, currentPos, newPos = pos, charIterator, nextPos, absCount = Math.abs(count), token;
      if (count !== 0) {
        var backward = count < 0;
        switch(unit) {
          case CHARACTER:
            charIterator = createCharacterIterator(pos, backward, null, characterOptions);
            while ((currentPos = charIterator.next()) && unitsMoved < absCount) {
              ++unitsMoved;
              newPos = currentPos;
            }
            nextPos = currentPos;
            charIterator.dispose();
            break;
          case WORD:
            var tokenizedTextProvider = createTokenizedTextProvider(pos, characterOptions, wordOptions);
            var next = backward ? tokenizedTextProvider.previousStartToken : tokenizedTextProvider.nextEndToken;
            while ((token = next()) && unitsMoved < absCount) {
              if (token.isWord) {
                ++unitsMoved;
                newPos = backward ? token.chars[0] : token.chars[token.chars.length - 1];
              }
            }
            break;
          default:
            throw new Error("movePositionBy: unit '" + unit + "' not implemented");;
        }
        if (backward) {
          newPos = newPos.previousVisible();
          unitsMoved = -unitsMoved;
        } else {
          if (newPos && newPos.isLeadingSpace) {
            if (unit == WORD) {
              charIterator = createCharacterIterator(pos, false, null, characterOptions);
              nextPos = charIterator.next();
              charIterator.dispose();
            }
            if (nextPos) {
              newPos = nextPos.previousVisible();
            }
          }
        }
      }
      return{position:newPos, unitsMoved:unitsMoved};
    }
    function createRangeCharacterIterator(session, range, characterOptions, backward) {
      var rangeStart = session.getRangeBoundaryPosition(range, true);
      var rangeEnd = session.getRangeBoundaryPosition(range, false);
      var itStart = backward ? rangeEnd : rangeStart;
      var itEnd = backward ? rangeStart : rangeEnd;
      return createCharacterIterator(itStart, !!backward, itEnd, characterOptions);
    }
    function getRangeCharacters(session, range, characterOptions) {
      var chars = [], it = createRangeCharacterIterator(session, range, characterOptions), pos;
      while (pos = it.next()) {
        chars.push(pos);
      }
      it.dispose();
      return chars;
    }
    function isWholeWord(startPos, endPos, wordOptions) {
      var range = api.createRange(startPos.node);
      range.setStartAndEnd(startPos.node, startPos.offset, endPos.node, endPos.offset);
      var returnVal = !range.expand("word", wordOptions);
      return returnVal;
    }
    function findTextFromPosition(initialPos, searchTerm, isRegex, searchScopeRange, findOptions) {
      var backward = isDirectionBackward(findOptions.direction);
      var it = createCharacterIterator(initialPos, backward, initialPos.session.getRangeBoundaryPosition(searchScopeRange, backward), findOptions.characterOptions);
      var text = "", chars = [], pos, currentChar, matchStartIndex, matchEndIndex;
      var result, insideRegexMatch;
      var returnValue = null;
      function handleMatch(startIndex, endIndex) {
        var startPos = chars[startIndex].previousVisible();
        var endPos = chars[endIndex - 1];
        var valid = !findOptions.wholeWordsOnly || isWholeWord(startPos, endPos, findOptions.wordOptions);
        return{startPos:startPos, endPos:endPos, valid:valid};
      }
      while (pos = it.next()) {
        currentChar = pos.character;
        if (!isRegex && !findOptions.caseSensitive) {
          currentChar = currentChar.toLowerCase();
        }
        if (backward) {
          chars.unshift(pos);
          text = currentChar + text;
        } else {
          chars.push(pos);
          text += currentChar;
        }
        if (isRegex) {
          result = searchTerm.exec(text);
          if (result) {
            matchStartIndex = result.index;
            matchEndIndex = matchStartIndex + result[0].length;
            if (insideRegexMatch) {
              if (!backward && matchEndIndex < text.length || backward && matchStartIndex > 0) {
                returnValue = handleMatch(matchStartIndex, matchEndIndex);
                break;
              }
            } else {
              insideRegexMatch = true;
            }
          }
        } else {
          if ((matchStartIndex = text.indexOf(searchTerm)) != -1) {
            returnValue = handleMatch(matchStartIndex, matchStartIndex + searchTerm.length);
            break;
          }
        }
      }
      if (insideRegexMatch) {
        returnValue = handleMatch(matchStartIndex, matchEndIndex);
      }
      it.dispose();
      return returnValue;
    }
    function createEntryPointFunction(func) {
      return function() {
        var sessionRunning = !!currentSession;
        var session = getSession();
        var args = [session].concat(util.toArray(arguments));
        var returnValue = func.apply(this, args);
        if (!sessionRunning) {
          endSession();
        }
        return returnValue;
      };
    }
    function createRangeBoundaryMover(isStart, collapse) {
      return createEntryPointFunction(function(session, unit, count, moveOptions) {
        if (typeof count == UNDEF) {
          count = unit;
          unit = CHARACTER;
        }
        moveOptions = createNestedOptions(moveOptions, defaultMoveOptions);
        var boundaryIsStart = isStart;
        if (collapse) {
          boundaryIsStart = count >= 0;
          this.collapse(!boundaryIsStart);
        }
        var moveResult = movePositionBy(session.getRangeBoundaryPosition(this, boundaryIsStart), unit, count, moveOptions.characterOptions, moveOptions.wordOptions);
        var newPos = moveResult.position;
        this[boundaryIsStart ? "setStart" : "setEnd"](newPos.node, newPos.offset);
        return moveResult.unitsMoved;
      });
    }
    function createRangeTrimmer(isStart) {
      return createEntryPointFunction(function(session, characterOptions) {
        characterOptions = createOptions(characterOptions, defaultCharacterOptions);
        var pos;
        var it = createRangeCharacterIterator(session, this, characterOptions, !isStart);
        var trimCharCount = 0;
        while ((pos = it.next()) && allWhiteSpaceRegex.test(pos.character)) {
          ++trimCharCount;
        }
        it.dispose();
        var trimmed = trimCharCount > 0;
        if (trimmed) {
          this[isStart ? "moveStart" : "moveEnd"]("character", isStart ? trimCharCount : -trimCharCount, {characterOptions:characterOptions});
        }
        return trimmed;
      });
    }
    extend(api.rangePrototype, {moveStart:createRangeBoundaryMover(true, false), moveEnd:createRangeBoundaryMover(false, false), move:createRangeBoundaryMover(true, true), trimStart:createRangeTrimmer(true), trimEnd:createRangeTrimmer(false), trim:createEntryPointFunction(function(session, characterOptions) {
      var startTrimmed = this.trimStart(characterOptions), endTrimmed = this.trimEnd(characterOptions);
      return startTrimmed || endTrimmed;
    }), expand:createEntryPointFunction(function(session, unit, expandOptions) {
      var moved = false;
      expandOptions = createNestedOptions(expandOptions, defaultExpandOptions);
      var characterOptions = expandOptions.characterOptions;
      if (!unit) {
        unit = CHARACTER;
      }
      if (unit == WORD) {
        var wordOptions = expandOptions.wordOptions;
        var startPos = session.getRangeBoundaryPosition(this, true);
        var endPos = session.getRangeBoundaryPosition(this, false);
        var startTokenizedTextProvider = createTokenizedTextProvider(startPos, characterOptions, wordOptions);
        var startToken = startTokenizedTextProvider.nextEndToken();
        var newStartPos = startToken.chars[0].previousVisible();
        var endToken, newEndPos;
        if (this.collapsed) {
          endToken = startToken;
        } else {
          var endTokenizedTextProvider = createTokenizedTextProvider(endPos, characterOptions, wordOptions);
          endToken = endTokenizedTextProvider.previousStartToken();
        }
        newEndPos = endToken.chars[endToken.chars.length - 1];
        if (!newStartPos.equals(startPos)) {
          this.setStart(newStartPos.node, newStartPos.offset);
          moved = true;
        }
        if (newEndPos && !newEndPos.equals(endPos)) {
          this.setEnd(newEndPos.node, newEndPos.offset);
          moved = true;
        }
        if (expandOptions.trim) {
          if (expandOptions.trimStart) {
            moved = this.trimStart(characterOptions) || moved;
          }
          if (expandOptions.trimEnd) {
            moved = this.trimEnd(characterOptions) || moved;
          }
        }
        return moved;
      } else {
        return this.moveEnd(CHARACTER, 1, expandOptions);
      }
    }), text:createEntryPointFunction(function(session, characterOptions) {
      return this.collapsed ? "" : getRangeCharacters(session, this, createOptions(characterOptions, defaultCharacterOptions)).join("");
    }), selectCharacters:createEntryPointFunction(function(session, containerNode, startIndex, endIndex, characterOptions) {
      var moveOptions = {characterOptions:characterOptions};
      if (!containerNode) {
        containerNode = getBody(this.getDocument());
      }
      this.selectNodeContents(containerNode);
      this.collapse(true);
      this.moveStart("character", startIndex, moveOptions);
      this.collapse(true);
      this.moveEnd("character", endIndex - startIndex, moveOptions);
    }), toCharacterRange:createEntryPointFunction(function(session, containerNode, characterOptions) {
      if (!containerNode) {
        containerNode = getBody(this.getDocument());
      }
      var parent = containerNode.parentNode, nodeIndex = dom.getNodeIndex(containerNode);
      var rangeStartsBeforeNode = dom.comparePoints(this.startContainer, this.endContainer, parent, nodeIndex) == -1;
      var rangeBetween = this.cloneRange();
      var startIndex, endIndex;
      if (rangeStartsBeforeNode) {
        rangeBetween.setStartAndEnd(this.startContainer, this.startOffset, parent, nodeIndex);
        startIndex = -rangeBetween.text(characterOptions).length;
      } else {
        rangeBetween.setStartAndEnd(parent, nodeIndex, this.startContainer, this.startOffset);
        startIndex = rangeBetween.text(characterOptions).length;
      }
      endIndex = startIndex + this.text(characterOptions).length;
      return{start:startIndex, end:endIndex};
    }), findText:createEntryPointFunction(function(session, searchTermParam, findOptions) {
      findOptions = createNestedOptions(findOptions, defaultFindOptions);
      if (findOptions.wholeWordsOnly) {
        findOptions.wordOptions.includeTrailingSpace = false;
      }
      var backward = isDirectionBackward(findOptions.direction);
      var searchScopeRange = findOptions.withinRange;
      if (!searchScopeRange) {
        searchScopeRange = api.createRange();
        searchScopeRange.selectNodeContents(this.getDocument());
      }
      var searchTerm = searchTermParam, isRegex = false;
      if (typeof searchTerm == "string") {
        if (!findOptions.caseSensitive) {
          searchTerm = searchTerm.toLowerCase();
        }
      } else {
        isRegex = true;
      }
      var initialPos = session.getRangeBoundaryPosition(this, !backward);
      var comparison = searchScopeRange.comparePoint(initialPos.node, initialPos.offset);
      if (comparison === -1) {
        initialPos = session.getRangeBoundaryPosition(searchScopeRange, true);
      } else {
        if (comparison === 1) {
          initialPos = session.getRangeBoundaryPosition(searchScopeRange, false);
        }
      }
      var pos = initialPos;
      var wrappedAround = false;
      var findResult;
      while (true) {
        findResult = findTextFromPosition(pos, searchTerm, isRegex, searchScopeRange, findOptions);
        if (findResult) {
          if (findResult.valid) {
            this.setStartAndEnd(findResult.startPos.node, findResult.startPos.offset, findResult.endPos.node, findResult.endPos.offset);
            return true;
          } else {
            pos = backward ? findResult.startPos : findResult.endPos;
          }
        } else {
          if (findOptions.wrap && !wrappedAround) {
            searchScopeRange = searchScopeRange.cloneRange();
            pos = session.getRangeBoundaryPosition(searchScopeRange, !backward);
            searchScopeRange.setBoundary(initialPos.node, initialPos.offset, backward);
            wrappedAround = true;
          } else {
            return false;
          }
        }
      }
    }), pasteHtml:function(html) {
      this.deleteContents();
      if (html) {
        var frag = this.createContextualFragment(html);
        var lastChild = frag.lastChild;
        this.insertNode(frag);
        this.collapseAfter(lastChild);
      }
    }});
    function createSelectionTrimmer(methodName) {
      return createEntryPointFunction(function(session, characterOptions) {
        var trimmed = false;
        this.changeEachRange(function(range) {
          trimmed = range[methodName](characterOptions) || trimmed;
        });
        return trimmed;
      });
    }
    extend(api.selectionPrototype, {expand:createEntryPointFunction(function(session, unit, expandOptions) {
      this.changeEachRange(function(range) {
        range.expand(unit, expandOptions);
      });
    }), move:createEntryPointFunction(function(session, unit, count, options) {
      var unitsMoved = 0;
      if (this.focusNode) {
        this.collapse(this.focusNode, this.focusOffset);
        var range = this.getRangeAt(0);
        if (!options) {
          options = {};
        }
        options.characterOptions = createOptions(options.characterOptions, defaultCaretCharacterOptions);
        unitsMoved = range.move(unit, count, options);
        this.setSingleRange(range);
      }
      return unitsMoved;
    }), trimStart:createSelectionTrimmer("trimStart"), trimEnd:createSelectionTrimmer("trimEnd"), trim:createSelectionTrimmer("trim"), selectCharacters:createEntryPointFunction(function(session, containerNode, startIndex, endIndex, direction, characterOptions) {
      var range = api.createRange(containerNode);
      range.selectCharacters(containerNode, startIndex, endIndex, characterOptions);
      this.setSingleRange(range, direction);
    }), saveCharacterRanges:createEntryPointFunction(function(session, containerNode, characterOptions) {
      var ranges = this.getAllRanges(), rangeCount = ranges.length;
      var rangeInfos = [];
      var backward = rangeCount == 1 && this.isBackward();
      for (var i = 0, len = ranges.length;i < len;++i) {
        rangeInfos[i] = {characterRange:ranges[i].toCharacterRange(containerNode, characterOptions), backward:backward, characterOptions:characterOptions};
      }
      return rangeInfos;
    }), restoreCharacterRanges:createEntryPointFunction(function(session, containerNode, saved) {
      this.removeAllRanges();
      for (var i = 0, len = saved.length, range, rangeInfo, characterRange;i < len;++i) {
        rangeInfo = saved[i];
        characterRange = rangeInfo.characterRange;
        range = api.createRange(containerNode);
        range.selectCharacters(containerNode, characterRange.start, characterRange.end, rangeInfo.characterOptions);
        this.addRange(range, rangeInfo.backward);
      }
    }), text:createEntryPointFunction(function(session, characterOptions) {
      var rangeTexts = [];
      for (var i = 0, len = this.rangeCount;i < len;++i) {
        rangeTexts[i] = this.getRangeAt(i).text(characterOptions);
      }
      return rangeTexts.join("");
    })});
    api.innerText = function(el, characterOptions) {
      var range = api.createRange(el);
      range.selectNodeContents(el);
      var text = range.text(characterOptions);
      return text;
    };
    api.createWordIterator = function(startNode, startOffset, iteratorOptions) {
      var session = getSession();
      iteratorOptions = createNestedOptions(iteratorOptions, defaultWordIteratorOptions);
      var startPos = session.getPosition(startNode, startOffset);
      var tokenizedTextProvider = createTokenizedTextProvider(startPos, iteratorOptions.characterOptions, iteratorOptions.wordOptions);
      var backward = isDirectionBackward(iteratorOptions.direction);
      return{next:function() {
        return backward ? tokenizedTextProvider.previousStartToken() : tokenizedTextProvider.nextEndToken();
      }, dispose:function() {
        tokenizedTextProvider.dispose();
        this.next = function() {
        };
      }};
    };
    api.noMutation = function(func) {
      var session = getSession();
      func(session);
      endSession();
    };
    api.noMutation.createEntryPointFunction = createEntryPointFunction;
    api.textRange = {isBlockNode:isBlockNode, isCollapsedWhitespaceNode:isCollapsedWhitespaceNode, createPosition:createEntryPointFunction(function(session, node, offset) {
      return session.getPosition(node, offset);
    })};
  });
}, this);
CLOSURE_BASE_PATH = "third_party/closure-library/closure/goog/";
var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.global.CLOSURE_UNCOMPILED_DEFINES;
goog.global.CLOSURE_DEFINES;
goog.isDef = function(val) {
  return val !== void 0;
};
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0]);
  }
  for (var part;parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object;
    } else {
      if (cur[part]) {
        cur = cur[part];
      } else {
        cur = cur[part] = {};
      }
    }
  }
};
goog.define = function(name, defaultValue) {
  var value = defaultValue;
  if (!COMPILED) {
    if (goog.global.CLOSURE_UNCOMPILED_DEFINES && Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_UNCOMPILED_DEFINES, name)) {
      value = goog.global.CLOSURE_UNCOMPILED_DEFINES[name];
    } else {
      if (goog.global.CLOSURE_DEFINES && Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_DEFINES, name)) {
        value = goog.global.CLOSURE_DEFINES[name];
      }
    }
  }
  goog.exportPath_(name, value);
};
goog.DEBUG = true;
goog.define("goog.LOCALE", "en");
goog.define("goog.TRUSTED_SITE", true);
goog.define("goog.STRICT_MODE_COMPATIBLE", false);
goog.define("goog.DISALLOW_TEST_ONLY_CODE", COMPILED && !goog.DEBUG);
goog.provide = function(name) {
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
  }
  goog.constructNamespace_(name);
};
goog.constructNamespace_ = function(name, opt_obj) {
  if (!COMPILED) {
    delete goog.implicitNamespaces_[name];
    var namespace = name;
    while (namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }
  goog.exportPath_(name, opt_obj);
};
goog.VALID_MODULE_RE_ = /^[a-zA-Z_$][a-zA-Z0-9._$]*$/;
goog.module = function(name) {
  if (!goog.isString(name) || !name || name.search(goog.VALID_MODULE_RE_) == -1) {
    throw Error("Invalid module identifier");
  }
  if (!goog.isInModuleLoader_()) {
    throw Error("Module " + name + " has been loaded incorrectly.");
  }
  if (goog.moduleLoaderState_.moduleName) {
    throw Error("goog.module may only be called once per module.");
  }
  goog.moduleLoaderState_.moduleName = name;
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
  }
};
goog.module.get = function(name) {
  return goog.module.getInternal_(name);
};
goog.module.getInternal_ = function(name) {
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      return name in goog.loadedModules_ ? goog.loadedModules_[name] : goog.getObjectByName(name);
    } else {
      return null;
    }
  }
};
goog.moduleLoaderState_ = null;
goog.isInModuleLoader_ = function() {
  return goog.moduleLoaderState_ != null;
};
goog.module.declareTestMethods = function() {
  if (!goog.isInModuleLoader_()) {
    throw new Error("goog.module.declareTestMethods must be called from " + "within a goog.module");
  }
  goog.moduleLoaderState_.declareTestMethods = true;
};
goog.module.declareLegacyNamespace = function() {
  if (!COMPILED && !goog.isInModuleLoader_()) {
    throw new Error("goog.module.declareLegacyNamespace must be called from " + "within a goog.module");
  }
  if (!COMPILED && !goog.moduleLoaderState_.moduleName) {
    throw Error("goog.module must be called prior to " + "goog.module.declareLegacyNamespace.");
  }
  goog.moduleLoaderState_.declareLegacyNamespace = true;
};
goog.setTestOnly = function(opt_message) {
  if (goog.DISALLOW_TEST_ONLY_CODE) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + (opt_message ? ": " + opt_message : "."));
  }
};
goog.forwardDeclare = function(name) {
};
if (!COMPILED) {
  goog.isProvided_ = function(name) {
    return name in goog.loadedModules_ || !goog.implicitNamespaces_[name] && goog.isDefAndNotNull(goog.getObjectByName(name));
  };
  goog.implicitNamespaces_ = {"goog.module":true};
}
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for (var part;part = parts.shift();) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};
goog.addDependency = function(relPath, provides, requires, opt_isModule) {
  if (goog.DEPENDENCIES_ENABLED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for (var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      deps.pathIsModule[path] = !!opt_isModule;
    }
    for (var j = 0;require = requires[j];j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};
goog.define("goog.ENABLE_DEBUG_LOADER", true);
goog.logToConsole_ = function(msg) {
  if (goog.global.console) {
    goog.global.console["error"](msg);
  }
};
goog.require = function(name) {
  if (!COMPILED) {
    if (goog.ENABLE_DEBUG_LOADER && goog.IS_OLD_IE_) {
      goog.maybeProcessDeferredDep_(name);
    }
    if (goog.isProvided_(name)) {
      if (goog.isInModuleLoader_()) {
        return goog.module.getInternal_(name);
      } else {
        return null;
      }
    }
    if (goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if (path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return null;
      }
    }
    var errorMessage = "goog.require could not find: " + name;
    goog.logToConsole_(errorMessage);
    throw Error(errorMessage);
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(opt_returnValue, var_args) {
  return opt_returnValue;
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    return ctor.instance_ = new ctor;
  };
};
goog.instantiatedSingletons_ = [];
goog.define("goog.LOAD_MODULE_USING_EVAL", true);
goog.define("goog.SEAL_MODULE_EXPORTS", goog.DEBUG);
goog.loadedModules_ = {};
goog.DEPENDENCIES_ENABLED = !COMPILED && goog.ENABLE_DEBUG_LOADER;
if (goog.DEPENDENCIES_ENABLED) {
  goog.included_ = {};
  goog.dependencies_ = {pathIsModule:{}, nameToPath:{}, requires:{}, visited:{}, written:{}, deferred:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc;
  };
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else {
      if (!goog.inHtmlDocument_()) {
        return;
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for (var i = scripts.length - 1;i >= 0;--i) {
      var script = (scripts[i]);
      var src = script.src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };
  goog.importScript_ = function(src, opt_sourceText) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if (importScript(src, opt_sourceText)) {
      goog.dependencies_.written[src] = true;
    }
  };
  goog.IS_OLD_IE_ = goog.global.document && goog.global.document.all && !goog.global.atob;
  goog.importModule_ = function(src) {
    var bootstrap = 'goog.retrieveAndExecModule_("' + src + '");';
    if (goog.importScript_("", bootstrap)) {
      goog.dependencies_.written[src] = true;
    }
  };
  goog.queuedModules_ = [];
  goog.wrapModule_ = function(srcUrl, scriptText) {
    if (!goog.LOAD_MODULE_USING_EVAL || !goog.isDef(goog.global.JSON)) {
      return "" + "goog.loadModule(function(exports) {" + '"use strict";' + scriptText + "\n" + ";return exports" + "});" + "\n//# sourceURL=" + srcUrl + "\n";
    } else {
      return "" + "goog.loadModule(" + goog.global.JSON.stringify(scriptText + "\n//# sourceURL=" + srcUrl + "\n") + ");";
    }
  };
  goog.loadQueuedModules_ = function() {
    var count = goog.queuedModules_.length;
    if (count > 0) {
      var queue = goog.queuedModules_;
      goog.queuedModules_ = [];
      for (var i = 0;i < count;i++) {
        var path = queue[i];
        goog.maybeProcessDeferredPath_(path);
      }
    }
  };
  goog.maybeProcessDeferredDep_ = function(name) {
    if (goog.isDeferredModule_(name) && goog.allDepsAreAvailable_(name)) {
      var path = goog.getPathFromDeps_(name);
      goog.maybeProcessDeferredPath_(goog.basePath + path);
    }
  };
  goog.isDeferredModule_ = function(name) {
    var path = goog.getPathFromDeps_(name);
    if (path && goog.dependencies_.pathIsModule[path]) {
      var abspath = goog.basePath + path;
      return abspath in goog.dependencies_.deferred;
    }
    return false;
  };
  goog.allDepsAreAvailable_ = function(name) {
    var path = goog.getPathFromDeps_(name);
    if (path && path in goog.dependencies_.requires) {
      for (var requireName in goog.dependencies_.requires[path]) {
        if (!goog.isProvided_(requireName) && !goog.isDeferredModule_(requireName)) {
          return false;
        }
      }
    }
    return true;
  };
  goog.maybeProcessDeferredPath_ = function(abspath) {
    if (abspath in goog.dependencies_.deferred) {
      var src = goog.dependencies_.deferred[abspath];
      delete goog.dependencies_.deferred[abspath];
      goog.globalEval(src);
    }
  };
  goog.loadModule = function(moduleDef) {
    var previousState = goog.moduleLoaderState_;
    try {
      goog.moduleLoaderState_ = {moduleName:undefined, declareTestMethods:false};
      var exports;
      if (goog.isFunction(moduleDef)) {
        exports = moduleDef.call(goog.global, {});
      } else {
        if (goog.isString(moduleDef)) {
          exports = goog.loadModuleFromSource_.call(goog.global, moduleDef);
        } else {
          throw Error("Invalid module definition");
        }
      }
      var moduleName = goog.moduleLoaderState_.moduleName;
      if (!goog.isString(moduleName) || !moduleName) {
        throw Error('Invalid module name "' + moduleName + '"');
      }
      if (goog.moduleLoaderState_.declareLegacyNamespace) {
        goog.constructNamespace_(moduleName, exports);
      } else {
        if (goog.SEAL_MODULE_EXPORTS && Object.seal) {
          Object.seal(exports);
        }
      }
      goog.loadedModules_[moduleName] = exports;
      if (goog.moduleLoaderState_.declareTestMethods) {
        for (var entry in exports) {
          if (entry.indexOf("test", 0) === 0 || entry == "tearDown" || entry == "setUp" || entry == "setUpPage" || entry == "tearDownPage") {
            goog.global[entry] = exports[entry];
          }
        }
      }
    } finally {
      goog.moduleLoaderState_ = previousState;
    }
  };
  goog.loadModuleFromSource_ = function(source) {
    var exports = {};
    eval(arguments[0]);
    return exports;
  };
  goog.writeScriptTag_ = function(src, opt_sourceText) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      if (doc.readyState == "complete") {
        var isDeps = /\bdeps.js$/.test(src);
        if (isDeps) {
          return false;
        } else {
          throw Error('Cannot write "' + src + '" after document load');
        }
      }
      var isOldIE = goog.IS_OLD_IE_;
      if (opt_sourceText === undefined) {
        if (!isOldIE) {
          doc.write('<script type="text/javascript" src="' + src + '"></' + "script>");
        } else {
          var state = " onreadystatechange='goog.onScriptLoad_(this, " + ++goog.lastNonModuleScriptIndex_ + ")' ";
          doc.write('<script type="text/javascript" src="' + src + '"' + state + "></" + "script>");
        }
      } else {
        doc.write('<script type="text/javascript">' + opt_sourceText + "</" + "script>");
      }
      return true;
    } else {
      return false;
    }
  };
  goog.lastNonModuleScriptIndex_ = 0;
  goog.onScriptLoad_ = function(script, scriptIndex) {
    if (script.readyState == "complete" && goog.lastNonModuleScriptIndex_ == scriptIndex) {
      goog.loadQueuedModules_();
    }
    return true;
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if (path in deps.written) {
        return;
      }
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }
      deps.visited[path] = true;
      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          if (!goog.isProvided_(requireName)) {
            if (requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName]);
            } else {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }
    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }
    for (var i = 0;i < scripts.length;i++) {
      var path = scripts[i];
      goog.dependencies_.written[path] = true;
    }
    var moduleState = goog.moduleLoaderState_;
    goog.moduleLoaderState_ = null;
    var loadingModule = false;
    for (var i = 0;i < scripts.length;i++) {
      var path = scripts[i];
      if (path) {
        if (!deps.pathIsModule[path]) {
          goog.importScript_(goog.basePath + path);
        } else {
          loadingModule = true;
          goog.importModule_(goog.basePath + path);
        }
      } else {
        goog.moduleLoaderState_ = moduleState;
        throw Error("Undefined script input");
      }
    }
    goog.moduleLoaderState_ = moduleState;
  };
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };
  goog.findBasePath_();
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js");
  }
}
goog.normalizePath_ = function(path) {
  var components = path.split("/");
  var i = 0;
  while (i < components.length) {
    if (components[i] == ".") {
      components.splice(i, 1);
    } else {
      if (i && components[i] == ".." && components[i - 1] && components[i - 1] != "..") {
        components.splice(--i, 2);
      } else {
        i++;
      }
    }
  }
  return components.join("/");
};
goog.retrieveAndExecModule_ = function(src) {
  if (!COMPILED) {
    var originalPath = src;
    src = goog.normalizePath_(src);
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    var scriptText = null;
    var xhr = new goog.global["XMLHttpRequest"];
    xhr.onload = function() {
      scriptText = this.responseText;
    };
    xhr.open("get", src, false);
    xhr.send();
    scriptText = xhr.responseText;
    if (scriptText != null) {
      var execModuleScript = goog.wrapModule_(src, scriptText);
      var isOldIE = goog.IS_OLD_IE_;
      if (isOldIE) {
        goog.dependencies_.deferred[originalPath] = execModuleScript;
        goog.queuedModules_.push(originalPath);
      } else {
        importScript(src, execModuleScript);
      }
    } else {
      throw new Error("load of " + src + "failed");
    }
  }
};
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == "object") {
    if (value) {
      if (value instanceof Array) {
        return "array";
      } else {
        if (value instanceof Object) {
          return s;
        }
      }
      var className = Object.prototype.toString.call((value));
      if (className == "[object Window]") {
        return "object";
      }
      if (className == "[object Array]" || typeof value.length == "number" && typeof value.splice != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")) {
        return "array";
      }
      if (className == "[object Function]" || typeof value.call != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call")) {
        return "function";
      }
    } else {
      return "null";
    }
  } else {
    if (s == "function" && typeof value.call == "undefined") {
      return "object";
    }
  }
  return s;
};
goog.isNull = function(val) {
  return val === null;
};
goog.isDefAndNotNull = function(val) {
  return val != null;
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array";
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number";
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function";
};
goog.isString = function(val) {
  return typeof val == "string";
};
goog.isBoolean = function(val) {
  return typeof val == "boolean";
};
goog.isNumber = function(val) {
  return typeof val == "number";
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function";
};
goog.isObject = function(val) {
  var type = typeof val;
  return type == "object" && val != null || type == "function";
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};
goog.hasUid = function(obj) {
  return!!obj[goog.UID_PROPERTY_];
};
goog.removeUid = function(obj) {
  if ("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + (Math.random() * 1E9 >>> 0);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == "object" || type == "array") {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == "array" ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }
  return obj;
};
goog.bindNative_ = function(fn, selfObj, var_args) {
  return(fn.call.apply(fn.bind, arguments));
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error;
  }
  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };
  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if (Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = args.slice();
    newArgs.push.apply(newArgs, arguments);
    return fn.apply(this, newArgs);
  };
};
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }
};
goog.now = goog.TRUSTED_SITE && Date.now || function() {
  return+new Date;
};
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, "JavaScript");
  } else {
    if (goog.global.eval) {
      if (goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ = 1;");
        if (typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true;
        } else {
          goog.evalWorksForGlobals_ = false;
        }
      }
      if (goog.evalWorksForGlobals_) {
        goog.global.eval(script);
      } else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt);
      }
    } else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.evalWorksForGlobals_ = null;
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for (var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join("-");
  };
  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }
  if (opt_modifier) {
    return className + "-" + rename(opt_modifier);
  } else {
    return rename(className);
  }
};
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};
goog.global.CLOSURE_CSS_NAME_MAPPING;
if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}
goog.getMsg = function(str, opt_values) {
  if (opt_values) {
    str = str.replace(/\{\$([^}]+)}/g, function(match, key) {
      return key in opt_values ? opt_values[key] : match;
    });
  }
  return str;
};
goog.getMsgWithFallback = function(a, b) {
  return a;
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor;
  childCtor.base = function(me, methodName, var_args) {
    var args = new Array(arguments.length - 2);
    for (var i = 2;i < arguments.length;i++) {
      args[i - 2] = arguments[i];
    }
    return parentCtor.prototype[methodName].apply(me, args);
  };
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (goog.STRICT_MODE_COMPATIBLE || goog.DEBUG && !caller) {
    throw Error("arguments.caller not defined.  goog.base() cannot be used " + "with strict mode code. See " + "http://www.ecma-international.org/ecma-262/5.1/#sec-C");
  }
  if (caller.superClass_) {
    var ctorArgs = new Array(arguments.length - 1);
    for (var i = 1;i < arguments.length;i++) {
      ctorArgs[i - 1] = arguments[i];
    }
    return caller.superClass_.constructor.apply(me, ctorArgs);
  }
  var args = new Array(arguments.length - 2);
  for (var i = 2;i < arguments.length;i++) {
    args[i - 2] = arguments[i];
  }
  var foundCaller = false;
  for (var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else {
      if (foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args);
      }
    }
  }
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global);
};
if (!COMPILED) {
  goog.global["COMPILED"] = COMPILED;
}
goog.defineClass = function(superClass, def) {
  var constructor = def.constructor;
  var statics = def.statics;
  if (!constructor || constructor == Object.prototype.constructor) {
    constructor = function() {
      throw Error("cannot instantiate an interface (no constructor defined).");
    };
  }
  var cls = goog.defineClass.createSealingConstructor_(constructor, superClass);
  if (superClass) {
    goog.inherits(cls, superClass);
  }
  delete def.constructor;
  delete def.statics;
  goog.defineClass.applyProperties_(cls.prototype, def);
  if (statics != null) {
    if (statics instanceof Function) {
      statics(cls);
    } else {
      goog.defineClass.applyProperties_(cls, statics);
    }
  }
  return cls;
};
goog.defineClass.ClassDescriptor;
goog.define("goog.defineClass.SEAL_CLASS_INSTANCES", goog.DEBUG);
goog.defineClass.createSealingConstructor_ = function(ctr, superClass) {
  if (goog.defineClass.SEAL_CLASS_INSTANCES && Object.seal instanceof Function) {
    if (superClass && superClass.prototype && superClass.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_]) {
      return ctr;
    }
    var wrappedCtr = function() {
      var instance = ctr.apply(this, arguments) || this;
      instance[goog.UID_PROPERTY_] = instance[goog.UID_PROPERTY_];
      if (this.constructor === wrappedCtr) {
        Object.seal(instance);
      }
      return instance;
    };
    return wrappedCtr;
  }
  return ctr;
};
goog.defineClass.OBJECT_PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.defineClass.applyProperties_ = function(target, source) {
  var key;
  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
  for (var i = 0;i < goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length;i++) {
    key = goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[i];
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
};
goog.tagUnsealableClass = function(ctr) {
  if (!COMPILED && goog.defineClass.SEAL_CLASS_INSTANCES) {
    ctr.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_] = true;
  }
};
goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_ = "goog_defineClass_legacy_unsealable";
goog.provide("goog.labs.userAgent.browser");
goog.require("goog.array");
goog.require("goog.labs.userAgent.util");
goog.require("goog.object");
goog.require("goog.string");
goog.labs.userAgent.browser.matchOpera_ = function() {
  return goog.labs.userAgent.util.matchUserAgent("Opera") || goog.labs.userAgent.util.matchUserAgent("OPR");
};
goog.labs.userAgent.browser.matchIE_ = function() {
  return goog.labs.userAgent.util.matchUserAgent("Trident") || goog.labs.userAgent.util.matchUserAgent("MSIE");
};
goog.labs.userAgent.browser.matchFirefox_ = function() {
  return goog.labs.userAgent.util.matchUserAgent("Firefox");
};
goog.labs.userAgent.browser.matchSafari_ = function() {
  return goog.labs.userAgent.util.matchUserAgent("Safari") && !goog.labs.userAgent.util.matchUserAgent("Chrome") && !goog.labs.userAgent.util.matchUserAgent("CriOS") && !goog.labs.userAgent.util.matchUserAgent("Android");
};
goog.labs.userAgent.browser.matchCoast_ = function() {
  return goog.labs.userAgent.util.matchUserAgent("Coast");
};
goog.labs.userAgent.browser.matchIosWebview_ = function() {
  return(goog.labs.userAgent.util.matchUserAgent("iPad") || goog.labs.userAgent.util.matchUserAgent("iPhone")) && !goog.labs.userAgent.browser.matchSafari_() && !goog.labs.userAgent.browser.matchChrome_() && !goog.labs.userAgent.browser.matchCoast_() && goog.labs.userAgent.util.matchUserAgent("AppleWebKit");
};
goog.labs.userAgent.browser.matchChrome_ = function() {
  return goog.labs.userAgent.util.matchUserAgent("Chrome") || goog.labs.userAgent.util.matchUserAgent("CriOS");
};
goog.labs.userAgent.browser.matchAndroidBrowser_ = function() {
  return!goog.labs.userAgent.browser.isChrome() && goog.labs.userAgent.util.matchUserAgent("Android");
};
goog.labs.userAgent.browser.isOpera = goog.labs.userAgent.browser.matchOpera_;
goog.labs.userAgent.browser.isIE = goog.labs.userAgent.browser.matchIE_;
goog.labs.userAgent.browser.isFirefox = goog.labs.userAgent.browser.matchFirefox_;
goog.labs.userAgent.browser.isSafari = goog.labs.userAgent.browser.matchSafari_;
goog.labs.userAgent.browser.isCoast = goog.labs.userAgent.browser.matchCoast_;
goog.labs.userAgent.browser.isIosWebview = goog.labs.userAgent.browser.matchIosWebview_;
goog.labs.userAgent.browser.isChrome = goog.labs.userAgent.browser.matchChrome_;
goog.labs.userAgent.browser.isAndroidBrowser = goog.labs.userAgent.browser.matchAndroidBrowser_;
goog.labs.userAgent.browser.isSilk = function() {
  return goog.labs.userAgent.util.matchUserAgent("Silk");
};
goog.labs.userAgent.browser.getVersion = function() {
  var userAgentString = goog.labs.userAgent.util.getUserAgent();
  if (goog.labs.userAgent.browser.isIE()) {
    return goog.labs.userAgent.browser.getIEVersion_(userAgentString);
  }
  var versionTuples = goog.labs.userAgent.util.extractVersionTuples(userAgentString);
  var versionMap = {};
  goog.array.forEach(versionTuples, function(tuple) {
    var key = tuple[0];
    var value = tuple[1];
    versionMap[key] = value;
  });
  var versionMapHasKey = goog.partial(goog.object.containsKey, versionMap);
  function lookUpValueWithKeys(keys) {
    var key = goog.array.find(keys, versionMapHasKey);
    return versionMap[key] || "";
  }
  if (goog.labs.userAgent.browser.isOpera()) {
    return lookUpValueWithKeys(["Version", "Opera", "OPR"]);
  }
  if (goog.labs.userAgent.browser.isChrome()) {
    return lookUpValueWithKeys(["Chrome", "CriOS"]);
  }
  var tuple = versionTuples[2];
  return tuple && tuple[1] || "";
};
goog.labs.userAgent.browser.isVersionOrHigher = function(version) {
  return goog.string.compareVersions(goog.labs.userAgent.browser.getVersion(), version) >= 0;
};
goog.labs.userAgent.browser.getIEVersion_ = function(userAgent) {
  var rv = /rv: *([\d\.]*)/.exec(userAgent);
  if (rv && rv[1]) {
    return rv[1];
  }
  var version = "";
  var msie = /MSIE +([\d\.]+)/.exec(userAgent);
  if (msie && msie[1]) {
    var tridentVersion = /Trident\/(\d.\d)/.exec(userAgent);
    if (msie[1] == "7.0") {
      if (tridentVersion && tridentVersion[1]) {
        switch(tridentVersion[1]) {
          case "4.0":
            version = "8.0";
            break;
          case "5.0":
            version = "9.0";
            break;
          case "6.0":
            version = "10.0";
            break;
          case "7.0":
            version = "11.0";
            break;
        }
      } else {
        version = "7.0";
      }
    } else {
      version = msie[1];
    }
  }
  return version;
};
goog.provide("goog.userAgent");
goog.require("goog.labs.userAgent.browser");
goog.require("goog.labs.userAgent.engine");
goog.require("goog.labs.userAgent.platform");
goog.require("goog.labs.userAgent.util");
goog.require("goog.string");
goog.define("goog.userAgent.ASSUME_IE", false);
goog.define("goog.userAgent.ASSUME_GECKO", false);
goog.define("goog.userAgent.ASSUME_WEBKIT", false);
goog.define("goog.userAgent.ASSUME_MOBILE_WEBKIT", false);
goog.define("goog.userAgent.ASSUME_OPERA", false);
goog.define("goog.userAgent.ASSUME_ANY_VERSION", false);
goog.userAgent.BROWSER_KNOWN_ = goog.userAgent.ASSUME_IE || goog.userAgent.ASSUME_GECKO || goog.userAgent.ASSUME_MOBILE_WEBKIT || goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_OPERA;
goog.userAgent.getUserAgentString = function() {
  return goog.labs.userAgent.util.getUserAgent();
};
goog.userAgent.getNavigator = function() {
  return goog.global["navigator"] || null;
};
goog.userAgent.OPERA = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_OPERA : goog.labs.userAgent.browser.isOpera();
goog.userAgent.IE = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_IE : goog.labs.userAgent.browser.isIE();
goog.userAgent.GECKO = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_GECKO : goog.labs.userAgent.engine.isGecko();
goog.userAgent.WEBKIT = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_MOBILE_WEBKIT : goog.labs.userAgent.engine.isWebKit();
goog.userAgent.isMobile_ = function() {
  return goog.userAgent.WEBKIT && goog.labs.userAgent.util.matchUserAgent("Mobile");
};
goog.userAgent.MOBILE = goog.userAgent.ASSUME_MOBILE_WEBKIT || goog.userAgent.isMobile_();
goog.userAgent.SAFARI = goog.userAgent.WEBKIT;
goog.userAgent.determinePlatform_ = function() {
  var navigator = goog.userAgent.getNavigator();
  return navigator && navigator.platform || "";
};
goog.userAgent.PLATFORM = goog.userAgent.determinePlatform_();
goog.define("goog.userAgent.ASSUME_MAC", false);
goog.define("goog.userAgent.ASSUME_WINDOWS", false);
goog.define("goog.userAgent.ASSUME_LINUX", false);
goog.define("goog.userAgent.ASSUME_X11", false);
goog.define("goog.userAgent.ASSUME_ANDROID", false);
goog.define("goog.userAgent.ASSUME_IPHONE", false);
goog.define("goog.userAgent.ASSUME_IPAD", false);
goog.userAgent.PLATFORM_KNOWN_ = goog.userAgent.ASSUME_MAC || goog.userAgent.ASSUME_WINDOWS || goog.userAgent.ASSUME_LINUX || goog.userAgent.ASSUME_X11 || goog.userAgent.ASSUME_ANDROID || goog.userAgent.ASSUME_IPHONE || goog.userAgent.ASSUME_IPAD;
goog.userAgent.MAC = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_MAC : goog.labs.userAgent.platform.isMacintosh();
goog.userAgent.WINDOWS = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_WINDOWS : goog.labs.userAgent.platform.isWindows();
goog.userAgent.isLegacyLinux_ = function() {
  return goog.labs.userAgent.platform.isLinux() || goog.labs.userAgent.platform.isChromeOS();
};
goog.userAgent.LINUX = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_LINUX : goog.userAgent.isLegacyLinux_();
goog.userAgent.isX11_ = function() {
  var navigator = goog.userAgent.getNavigator();
  return!!navigator && goog.string.contains(navigator["appVersion"] || "", "X11");
};
goog.userAgent.X11 = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_X11 : goog.userAgent.isX11_();
goog.userAgent.ANDROID = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_ANDROID : goog.labs.userAgent.platform.isAndroid();
goog.userAgent.IPHONE = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_IPHONE : goog.labs.userAgent.platform.isIphone();
goog.userAgent.IPAD = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_IPAD : goog.labs.userAgent.platform.isIpad();
goog.userAgent.determineVersion_ = function() {
  var version = "", re;
  if (goog.userAgent.OPERA && goog.global["opera"]) {
    var operaVersion = goog.global["opera"].version;
    return goog.isFunction(operaVersion) ? operaVersion() : operaVersion;
  }
  if (goog.userAgent.GECKO) {
    re = /rv\:([^\);]+)(\)|;)/;
  } else {
    if (goog.userAgent.IE) {
      re = /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/;
    } else {
      if (goog.userAgent.WEBKIT) {
        re = /WebKit\/(\S+)/;
      }
    }
  }
  if (re) {
    var arr = re.exec(goog.userAgent.getUserAgentString());
    version = arr ? arr[1] : "";
  }
  if (goog.userAgent.IE) {
    var docMode = goog.userAgent.getDocumentMode_();
    if (docMode > parseFloat(version)) {
      return String(docMode);
    }
  }
  return version;
};
goog.userAgent.getDocumentMode_ = function() {
  var doc = goog.global["document"];
  return doc ? doc["documentMode"] : undefined;
};
goog.userAgent.VERSION = goog.userAgent.determineVersion_();
goog.userAgent.compare = function(v1, v2) {
  return goog.string.compareVersions(v1, v2);
};
goog.userAgent.isVersionOrHigherCache_ = {};
goog.userAgent.isVersionOrHigher = function(version) {
  return goog.userAgent.ASSUME_ANY_VERSION || goog.userAgent.isVersionOrHigherCache_[version] || (goog.userAgent.isVersionOrHigherCache_[version] = goog.string.compareVersions(goog.userAgent.VERSION, version) >= 0);
};
goog.userAgent.isVersion = goog.userAgent.isVersionOrHigher;
goog.userAgent.isDocumentModeOrHigher = function(documentMode) {
  return goog.userAgent.IE && goog.userAgent.DOCUMENT_MODE >= documentMode;
};
goog.userAgent.isDocumentMode = goog.userAgent.isDocumentModeOrHigher;
goog.userAgent.DOCUMENT_MODE = function() {
  var doc = goog.global["document"];
  if (!doc || !goog.userAgent.IE) {
    return undefined;
  }
  var mode = goog.userAgent.getDocumentMode_();
  return mode || (doc["compatMode"] == "CSS1Compat" ? parseInt(goog.userAgent.VERSION, 10) : 5);
}();
goog.provide("goog.dom.BrowserFeature");
goog.require("goog.userAgent");
goog.dom.BrowserFeature = {CAN_ADD_NAME_OR_TYPE_ATTRIBUTES:!goog.userAgent.IE || goog.userAgent.isDocumentModeOrHigher(9), CAN_USE_CHILDREN_ATTRIBUTE:!goog.userAgent.GECKO && !goog.userAgent.IE || goog.userAgent.IE && goog.userAgent.isDocumentModeOrHigher(9) || goog.userAgent.GECKO && goog.userAgent.isVersionOrHigher("1.9.1"), CAN_USE_INNER_TEXT:goog.userAgent.IE && !goog.userAgent.isVersionOrHigher("9"), CAN_USE_PARENT_ELEMENT_PROPERTY:goog.userAgent.IE || goog.userAgent.OPERA || goog.userAgent.WEBKIT, 
INNER_HTML_NEEDS_SCOPED_ELEMENT:goog.userAgent.IE, LEGACY_IE_RANGES:goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(9)};
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.define("goog.string.DETECT_DOUBLE_ESCAPING", false);
goog.define("goog.string.FORCE_NON_DOM_HTML_UNESCAPING", false);
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0;
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};
goog.string.caseInsensitiveEquals = function(str1, str2) {
  return str1.toLowerCase() == str2.toLowerCase();
};
goog.string.subs = function(str, var_args) {
  var splitParts = str.split("%s");
  var returnString = "";
  var subsArguments = Array.prototype.slice.call(arguments, 1);
  while (subsArguments.length && splitParts.length > 1) {
    returnString += splitParts.shift() + subsArguments.shift();
  }
  return returnString + splitParts.join("%s");
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "");
};
goog.string.isEmptyOrWhitespace = function(str) {
  return/^[\s\xa0]*$/.test(str);
};
goog.string.isEmptyString = function(str) {
  return str.length == 0;
};
goog.string.isEmpty = goog.string.isEmptyOrWhitespace;
goog.string.isEmptyOrWhitespaceSafe = function(str) {
  return goog.string.isEmptyOrWhitespace(goog.string.makeSafe(str));
};
goog.string.isEmptySafe = goog.string.isEmptyOrWhitespaceSafe;
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str);
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str);
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str);
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str);
};
goog.string.isSpace = function(ch) {
  return ch == " ";
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= " " && ch <= "~" || ch >= "\u0080" && ch <= "\ufffd";
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ");
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n");
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ");
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ");
};
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, " ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, "");
};
goog.string.trim = goog.TRUSTED_SITE && String.prototype.trim ? function(str) {
  return str.trim();
} : function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "");
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "");
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "");
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if (test1 < test2) {
    return-1;
  } else {
    if (test1 == test2) {
      return 0;
    } else {
      return 1;
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return-1;
  }
  if (!str2) {
    return 1;
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for (var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if (a != b) {
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }
  return str1 < str2 ? -1 : 1;
};
goog.string.urlEncode = function(str) {
  return encodeURIComponent(String(str));
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "));
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "<br />" : "<br>");
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if (opt_isLikelyToContainHtmlChars) {
    str = str.replace(goog.string.AMP_RE_, "&amp;").replace(goog.string.LT_RE_, "&lt;").replace(goog.string.GT_RE_, "&gt;").replace(goog.string.QUOT_RE_, "&quot;").replace(goog.string.SINGLE_QUOTE_RE_, "&#39;").replace(goog.string.NULL_RE_, "&#0;");
    if (goog.string.DETECT_DOUBLE_ESCAPING) {
      str = str.replace(goog.string.E_RE_, "&#101;");
    }
    return str;
  } else {
    if (!goog.string.ALL_RE_.test(str)) {
      return str;
    }
    if (str.indexOf("&") != -1) {
      str = str.replace(goog.string.AMP_RE_, "&amp;");
    }
    if (str.indexOf("<") != -1) {
      str = str.replace(goog.string.LT_RE_, "&lt;");
    }
    if (str.indexOf(">") != -1) {
      str = str.replace(goog.string.GT_RE_, "&gt;");
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.QUOT_RE_, "&quot;");
    }
    if (str.indexOf("'") != -1) {
      str = str.replace(goog.string.SINGLE_QUOTE_RE_, "&#39;");
    }
    if (str.indexOf("\x00") != -1) {
      str = str.replace(goog.string.NULL_RE_, "&#0;");
    }
    if (goog.string.DETECT_DOUBLE_ESCAPING && str.indexOf("e") != -1) {
      str = str.replace(goog.string.E_RE_, "&#101;");
    }
    return str;
  }
};
goog.string.AMP_RE_ = /&/g;
goog.string.LT_RE_ = /</g;
goog.string.GT_RE_ = />/g;
goog.string.QUOT_RE_ = /"/g;
goog.string.SINGLE_QUOTE_RE_ = /'/g;
goog.string.NULL_RE_ = /\x00/g;
goog.string.E_RE_ = /e/g;
goog.string.ALL_RE_ = goog.string.DETECT_DOUBLE_ESCAPING ? /[\x00&<>"'e]/ : /[\x00&<>"']/;
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, "&")) {
    if (!goog.string.FORCE_NON_DOM_HTML_UNESCAPING && "document" in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};
goog.string.unescapeEntitiesWithDocument = function(str, document) {
  if (goog.string.contains(str, "&")) {
    return goog.string.unescapeEntitiesUsingDom_(str, document);
  }
  return str;
};
goog.string.unescapeEntitiesUsingDom_ = function(str, opt_document) {
  var seen = {"&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"'};
  var div;
  if (opt_document) {
    div = opt_document.createElement("div");
  } else {
    div = goog.global.document.createElement("div");
  }
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    var value = seen[s];
    if (value) {
      return value;
    }
    if (entity.charAt(0) == "#") {
      var n = Number("0" + entity.substr(1));
      if (!isNaN(n)) {
        value = String.fromCharCode(n);
      }
    }
    if (!value) {
      div.innerHTML = s + " ";
      value = div.firstChild.nodeValue.slice(0, -1);
    }
    return seen[s] = value;
  });
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return'"';
      default:
        if (entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        return s;
    }
  });
};
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " &#160;"), opt_xml);
};
goog.string.preserveSpaces = function(str) {
  return str.replace(/(^|[\n ]) /g, "$1" + goog.string.Unicode.NBSP);
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }
  if (str.length > chars) {
    str = str.substring(0, chars - 3) + "...";
  }
  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }
  return str;
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }
  if (opt_trailingChars && str.length > chars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint);
  } else {
    if (str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos);
    }
  }
  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }
  return str;
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\b":"\\b", "\f":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch));
    }
    sb.push('"');
    return sb.join("");
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join("");
};
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }
  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    if (cc < 256) {
      rv = "\\x";
      if (cc < 16 || cc > 256) {
        rv += "0";
      }
    } else {
      rv = "\\u";
      if (cc < 4096) {
        rv += "0";
      }
    }
    rv += cc.toString(16).toUpperCase();
  }
  return goog.string.jsEscapeCache_[c] = rv;
};
goog.string.contains = function(str, subString) {
  return str.indexOf(subString) != -1;
};
goog.string.caseInsensitiveContains = function(str, subString) {
  return goog.string.contains(str.toLowerCase(), subString.toLowerCase());
};
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0;
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "");
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "");
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08");
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string);
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s;
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj);
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "");
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for (var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2]);
    } while (order == 0);
  }
  return order;
};
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return-1;
  } else {
    if (left > right) {
      return 1;
    }
  }
  return 0;
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return "goog_" + goog.string.uniqueStringCounter_++;
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmptyOrWhitespace(str)) {
    return NaN;
  }
  return num;
};
goog.string.isLowerCamelCase = function(str) {
  return/^[a-z]+([A-Z][a-z]*)*$/.test(str);
};
goog.string.isUpperCamelCase = function(str) {
  return/^([A-Z][a-z]*)+$/.test(str);
};
goog.string.toCamelCase = function(str) {
  return String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase();
  });
};
goog.string.toSelectorCase = function(str) {
  return String(str).replace(/([A-Z])/g, "-$1").toLowerCase();
};
goog.string.toTitleCase = function(str, opt_delimiters) {
  var delimiters = goog.isString(opt_delimiters) ? goog.string.regExpEscape(opt_delimiters) : "\\s";
  delimiters = delimiters ? "|[" + delimiters + "]+" : "";
  var regexp = new RegExp("(^" + delimiters + ")([a-z])", "g");
  return str.replace(regexp, function(all, p1, p2) {
    return p1 + p2.toUpperCase();
  });
};
goog.string.capitalize = function(str) {
  return String(str.charAt(0)).toUpperCase() + String(str.substr(1)).toLowerCase();
};
goog.string.parseInt = function(value) {
  if (isFinite(value)) {
    value = String(value);
  }
  if (goog.isString(value)) {
    return/^\s*-?0x/i.test(value) ? parseInt(value, 16) : parseInt(value, 10);
  }
  return NaN;
};
goog.string.splitLimit = function(str, separator, limit) {
  var parts = str.split(separator);
  var returnVal = [];
  while (limit > 0 && parts.length) {
    returnVal.push(parts.shift());
    limit--;
  }
  if (parts.length) {
    returnVal.push(parts.join(separator));
  }
  return returnVal;
};
goog.string.editDistance = function(a, b) {
  var v0 = [];
  var v1 = [];
  if (a == b) {
    return 0;
  }
  if (!a.length || !b.length) {
    return Math.max(a.length, b.length);
  }
  for (var i = 0;i < b.length + 1;i++) {
    v0[i] = i;
  }
  for (var i = 0;i < a.length;i++) {
    v1[0] = i + 1;
    for (var j = 0;j < b.length;j++) {
      var cost = a[i] != b[j];
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (var j = 0;j < v0.length;j++) {
      v0[j] = v1[j];
    }
  }
  return v1[b.length];
};
goog.provide("goog.dom.NodeType");
goog.dom.NodeType = {ELEMENT:1, ATTRIBUTE:2, TEXT:3, CDATA_SECTION:4, ENTITY_REFERENCE:5, ENTITY:6, PROCESSING_INSTRUCTION:7, COMMENT:8, DOCUMENT:9, DOCUMENT_TYPE:10, DOCUMENT_FRAGMENT:11, NOTATION:12};
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, goog.debug.Error);
  } else {
    var stack = (new Error).stack;
    if (stack) {
      this.stack = stack;
    }
  }
  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.dom.NodeType");
goog.require("goog.string");
goog.define("goog.asserts.ENABLE_ASSERTS", goog.DEBUG);
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.DEFAULT_ERROR_HANDLER = function(e) {
  throw e;
};
goog.asserts.errorHandler_ = goog.asserts.DEFAULT_ERROR_HANDLER;
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if (givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs;
  } else {
    if (defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs;
    }
  }
  var e = new goog.asserts.AssertionError("" + message, args || []);
  goog.asserts.errorHandler_(e);
};
goog.asserts.setErrorHandler = function(errorHandler) {
  if (goog.asserts.ENABLE_ASSERTS) {
    goog.asserts.errorHandler_ = errorHandler;
  }
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    goog.asserts.errorHandler_(new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1)));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertElement = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && (!goog.isObject(value) || value.nodeType != goog.dom.NodeType.ELEMENT)) {
    goog.asserts.doAssertFailure_("Expected Element but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("Expected instanceof %s but got %s.", [goog.asserts.getType_(type), goog.asserts.getType_(value)], opt_message, Array.prototype.slice.call(arguments, 3));
  }
  return value;
};
goog.asserts.assertObjectPrototypeIsIntact = function() {
  for (var key in Object.prototype) {
    goog.asserts.fail(key + " should not be enumerable in Object.prototype.");
  }
};
goog.asserts.getType_ = function(value) {
  if (value instanceof Function) {
    return value.displayName || value.name || "unknown type name";
  } else {
    if (value instanceof Object) {
      return value.constructor.displayName || value.constructor.name || Object.prototype.toString.call(value);
    } else {
      return value === null ? "null" : typeof value;
    }
  }
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.define("goog.NATIVE_ARRAY_PROTOTYPES", goog.TRUSTED_SITE);
goog.define("goog.array.ASSUME_NATIVE_FUNCTIONS", false);
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1];
};
goog.array.last = goog.array.peek;
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.indexOf) ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex);
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if (goog.isString(arr)) {
    if (!goog.isString(obj) || obj.length != 1) {
      return-1;
    }
    return arr.indexOf(obj, fromIndex);
  }
  for (var i = fromIndex;i < arr.length;i++) {
    if (i in arr && arr[i] === obj) {
      return i;
    }
  }
  return-1;
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.lastIndexOf) ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex);
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if (fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex);
  }
  if (goog.isString(arr)) {
    if (!goog.isString(obj) || obj.length != 1) {
      return-1;
    }
    return arr.lastIndexOf(obj, fromIndex);
  }
  for (var i = fromIndex;i >= 0;i--) {
    if (i in arr && arr[i] === obj) {
      return i;
    }
  }
  return-1;
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.forEach) ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = l - 1;i >= 0;--i) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.filter) ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2) {
      var val = arr2[i];
      if (f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val;
      }
    }
  }
  return res;
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.map) ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr);
    }
  }
  return res;
};
goog.array.reduce = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.reduce) ? function(arr, f, val, opt_obj) {
  goog.asserts.assert(arr.length != null);
  if (opt_obj) {
    f = goog.bind(f, opt_obj);
  }
  return goog.array.ARRAY_PROTOTYPE_.reduce.call(arr, f, val);
} : function(arr, f, val, opt_obj) {
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};
goog.array.reduceRight = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.reduceRight) ? function(arr, f, val, opt_obj) {
  goog.asserts.assert(arr.length != null);
  if (opt_obj) {
    f = goog.bind(f, opt_obj);
  }
  return goog.array.ARRAY_PROTOTYPE_.reduceRight.call(arr, f, val);
} : function(arr, f, val, opt_obj) {
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.some) ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true;
    }
  }
  return false;
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || goog.array.ARRAY_PROTOTYPE_.every) ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false;
    }
  }
  return true;
};
goog.array.count = function(arr, f, opt_obj) {
  var count = 0;
  goog.array.forEach(arr, function(element, index, arr) {
    if (f.call(opt_obj, element, index, arr)) {
      ++count;
    }
  }, opt_obj);
  return count;
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return-1;
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = l - 1;i >= 0;i--) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return-1;
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0;
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};
goog.array.clear = function(arr) {
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1;i >= 0;i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if (rv = i >= 0) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1;
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};
goog.array.removeAllIf = function(arr, f, opt_obj) {
  var removedCount = 0;
  goog.array.forEachRight(arr, function(val, index) {
    if (f.call(opt_obj, val, index, arr)) {
      if (goog.array.removeAt(arr, index)) {
        removedCount++;
      }
    }
  });
  return removedCount;
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments);
};
goog.array.join = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments);
};
goog.array.toArray = function(object) {
  var length = object.length;
  if (length > 0) {
    var rv = new Array(length);
    for (var i = 0;i < length;i++) {
      rv[i] = object[i];
    }
    return rv;
  }
  return[];
};
goog.array.clone = goog.array.toArray;
goog.array.extend = function(arr1, var_args) {
  for (var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    if (goog.isArrayLike(arr2)) {
      var len1 = arr1.length || 0;
      var len2 = arr2.length || 0;
      arr1.length = len1 + len2;
      for (var j = 0;j < len2;j++) {
        arr1[len1 + j] = arr2[j];
      }
    } else {
      arr1.push(arr2);
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1));
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if (arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start);
  } else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end);
  }
};
goog.array.removeDuplicates = function(arr, opt_rv, opt_hashFn) {
  var returnArray = opt_rv || arr;
  var defaultHashFn = function(item) {
    return goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
  };
  var hashFn = opt_hashFn || defaultHashFn;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = hashFn(current);
    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current;
    }
  }
  returnArray.length = cursorInsert;
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target);
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj);
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while (left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      compareResult = compareFn(opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      found = !compareResult;
    }
  }
  return found ? left : ~left;
};
goog.array.sort = function(arr, opt_compareFn) {
  arr.sort(opt_compareFn || goog.array.defaultCompare);
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for (var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  }
  goog.array.sort(arr, stableCompareFn);
  for (var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value;
  }
};
goog.array.sortByKey = function(arr, keyFn, opt_compareFn) {
  var keyCompareFn = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return keyCompareFn(keyFn(a), keyFn(b));
  });
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  goog.array.sortByKey(arr, function(obj) {
    return obj[key];
  }, opt_compareFn);
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for (var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if (compareResult > 0 || compareResult == 0 && opt_strict) {
      return false;
    }
  }
  return true;
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) || arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0;i < l;i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for (var i = 0;i < l;i++) {
    var result = compare(arr1[i], arr2[i]);
    if (result != 0) {
      return result;
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length);
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false;
};
goog.array.bucket = function(array, sorter, opt_obj) {
  var buckets = {};
  for (var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter.call(opt_obj, value, i, array);
    if (goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }
  return buckets;
};
goog.array.toObject = function(arr, keyFunc, opt_obj) {
  var ret = {};
  goog.array.forEach(arr, function(element, index) {
    ret[keyFunc.call(opt_obj, element, index, arr)] = element;
  });
  return ret;
};
goog.array.range = function(startOrEnd, opt_end, opt_step) {
  var array = [];
  var start = 0;
  var end = startOrEnd;
  var step = opt_step || 1;
  if (opt_end !== undefined) {
    start = startOrEnd;
    end = opt_end;
  }
  if (step * (end - start) < 0) {
    return[];
  }
  if (step > 0) {
    for (var i = start;i < end;i += step) {
      array.push(i);
    }
  } else {
    for (var i = start;i > end;i += step) {
      array.push(i);
    }
  }
  return array;
};
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0;i < n;i++) {
    array[i] = value;
  }
  return array;
};
goog.array.flatten = function(var_args) {
  var CHUNK_SIZE = 8192;
  var result = [];
  for (var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      for (var c = 0;c < element.length;c += CHUNK_SIZE) {
        var chunk = goog.array.slice(element, c, c + CHUNK_SIZE);
        var recurseResult = goog.array.flatten.apply(null, chunk);
        for (var r = 0;r < recurseResult.length;r++) {
          result.push(recurseResult[r]);
        }
      }
    } else {
      result.push(element);
    }
  }
  return result;
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if (array.length) {
    n %= array.length;
    if (n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n));
    } else {
      if (n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n));
      }
    }
  }
  return array;
};
goog.array.moveItem = function(arr, fromIndex, toIndex) {
  goog.asserts.assert(fromIndex >= 0 && fromIndex < arr.length);
  goog.asserts.assert(toIndex >= 0 && toIndex < arr.length);
  var removedItems = goog.array.ARRAY_PROTOTYPE_.splice.call(arr, fromIndex, 1);
  goog.array.ARRAY_PROTOTYPE_.splice.call(arr, toIndex, 0, removedItems[0]);
};
goog.array.zip = function(var_args) {
  if (!arguments.length) {
    return[];
  }
  var result = [];
  for (var i = 0;true;i++) {
    var value = [];
    for (var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if (i >= arr.length) {
        return result;
      }
      value.push(arr[i]);
    }
    result.push(value);
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for (var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};
goog.provide("goog.dom");
goog.provide("goog.dom.Appendable");
goog.provide("goog.dom.DomHelper");
goog.require("goog.array");
goog.require("goog.asserts");
goog.require("goog.dom.BrowserFeature");
goog.require("goog.dom.NodeType");
goog.require("goog.dom.TagName");
goog.require("goog.dom.safe");
goog.require("goog.html.SafeHtml");
goog.require("goog.math.Coordinate");
goog.require("goog.math.Size");
goog.require("goog.object");
goog.require("goog.string");
goog.require("goog.string.Unicode");
goog.require("goog.userAgent");
goog.define("goog.dom.ASSUME_QUIRKS_MODE", false);
goog.define("goog.dom.ASSUME_STANDARDS_MODE", false);
goog.dom.COMPAT_MODE_KNOWN_ = goog.dom.ASSUME_QUIRKS_MODE || goog.dom.ASSUME_STANDARDS_MODE;
goog.dom.getDomHelper = function(opt_element) {
  return opt_element ? new goog.dom.DomHelper(goog.dom.getOwnerDocument(opt_element)) : goog.dom.defaultDomHelper_ || (goog.dom.defaultDomHelper_ = new goog.dom.DomHelper);
};
goog.dom.defaultDomHelper_;
goog.dom.getDocument = function() {
  return document;
};
goog.dom.getElement = function(element) {
  return goog.dom.getElementHelper_(document, element);
};
goog.dom.getElementHelper_ = function(doc, element) {
  return goog.isString(element) ? doc.getElementById(element) : element;
};
goog.dom.getRequiredElement = function(id) {
  return goog.dom.getRequiredElementHelper_(document, id);
};
goog.dom.getRequiredElementHelper_ = function(doc, id) {
  goog.asserts.assertString(id);
  var element = goog.dom.getElementHelper_(doc, id);
  element = goog.asserts.assertElement(element, "No element found with id: " + id);
  return element;
};
goog.dom.$ = goog.dom.getElement;
goog.dom.getElementsByTagNameAndClass = function(opt_tag, opt_class, opt_el) {
  return goog.dom.getElementsByTagNameAndClass_(document, opt_tag, opt_class, opt_el);
};
goog.dom.getElementsByClass = function(className, opt_el) {
  var parent = opt_el || document;
  if (goog.dom.canUseQuerySelector_(parent)) {
    return parent.querySelectorAll("." + className);
  }
  return goog.dom.getElementsByTagNameAndClass_(document, "*", className, opt_el);
};
goog.dom.getElementByClass = function(className, opt_el) {
  var parent = opt_el || document;
  var retVal = null;
  if (goog.dom.canUseQuerySelector_(parent)) {
    retVal = parent.querySelector("." + className);
  } else {
    retVal = goog.dom.getElementsByTagNameAndClass_(document, "*", className, opt_el)[0];
  }
  return retVal || null;
};
goog.dom.getRequiredElementByClass = function(className, opt_root) {
  var retValue = goog.dom.getElementByClass(className, opt_root);
  return goog.asserts.assert(retValue, "No element found with className: " + className);
};
goog.dom.canUseQuerySelector_ = function(parent) {
  return!!(parent.querySelectorAll && parent.querySelector);
};
goog.dom.getElementsByTagNameAndClass_ = function(doc, opt_tag, opt_class, opt_el) {
  var parent = opt_el || doc;
  var tagName = opt_tag && opt_tag != "*" ? opt_tag.toUpperCase() : "";
  if (goog.dom.canUseQuerySelector_(parent) && (tagName || opt_class)) {
    var query = tagName + (opt_class ? "." + opt_class : "");
    return parent.querySelectorAll(query);
  }
  if (opt_class && parent.getElementsByClassName) {
    var els = parent.getElementsByClassName(opt_class);
    if (tagName) {
      var arrayLike = {};
      var len = 0;
      for (var i = 0, el;el = els[i];i++) {
        if (tagName == el.nodeName) {
          arrayLike[len++] = el;
        }
      }
      arrayLike.length = len;
      return arrayLike;
    } else {
      return els;
    }
  }
  var els = parent.getElementsByTagName(tagName || "*");
  if (opt_class) {
    var arrayLike = {};
    var len = 0;
    for (var i = 0, el;el = els[i];i++) {
      var className = el.className;
      if (typeof className.split == "function" && goog.array.contains(className.split(/\s+/), opt_class)) {
        arrayLike[len++] = el;
      }
    }
    arrayLike.length = len;
    return arrayLike;
  } else {
    return els;
  }
};
goog.dom.$$ = goog.dom.getElementsByTagNameAndClass;
goog.dom.setProperties = function(element, properties) {
  goog.object.forEach(properties, function(val, key) {
    if (key == "style") {
      element.style.cssText = val;
    } else {
      if (key == "class") {
        element.className = val;
      } else {
        if (key == "for") {
          element.htmlFor = val;
        } else {
          if (key in goog.dom.DIRECT_ATTRIBUTE_MAP_) {
            element.setAttribute(goog.dom.DIRECT_ATTRIBUTE_MAP_[key], val);
          } else {
            if (goog.string.startsWith(key, "aria-") || goog.string.startsWith(key, "data-")) {
              element.setAttribute(key, val);
            } else {
              element[key] = val;
            }
          }
        }
      }
    }
  });
};
goog.dom.DIRECT_ATTRIBUTE_MAP_ = {"cellpadding":"cellPadding", "cellspacing":"cellSpacing", "colspan":"colSpan", "frameborder":"frameBorder", "height":"height", "maxlength":"maxLength", "role":"role", "rowspan":"rowSpan", "type":"type", "usemap":"useMap", "valign":"vAlign", "width":"width"};
goog.dom.getViewportSize = function(opt_window) {
  return goog.dom.getViewportSize_(opt_window || window);
};
goog.dom.getViewportSize_ = function(win) {
  var doc = win.document;
  var el = goog.dom.isCss1CompatMode_(doc) ? doc.documentElement : doc.body;
  return new goog.math.Size(el.clientWidth, el.clientHeight);
};
goog.dom.getDocumentHeight = function() {
  return goog.dom.getDocumentHeight_(window);
};
goog.dom.getDocumentHeight_ = function(win) {
  var doc = win.document;
  var height = 0;
  if (doc) {
    var body = doc.body;
    var docEl = doc.documentElement;
    if (!(docEl && body)) {
      return 0;
    }
    var vh = goog.dom.getViewportSize_(win).height;
    if (goog.dom.isCss1CompatMode_(doc) && docEl.scrollHeight) {
      height = docEl.scrollHeight != vh ? docEl.scrollHeight : docEl.offsetHeight;
    } else {
      var sh = docEl.scrollHeight;
      var oh = docEl.offsetHeight;
      if (docEl.clientHeight != oh) {
        sh = body.scrollHeight;
        oh = body.offsetHeight;
      }
      if (sh > vh) {
        height = sh > oh ? sh : oh;
      } else {
        height = sh < oh ? sh : oh;
      }
    }
  }
  return height;
};
goog.dom.getPageScroll = function(opt_window) {
  var win = opt_window || goog.global || window;
  return goog.dom.getDomHelper(win.document).getDocumentScroll();
};
goog.dom.getDocumentScroll = function() {
  return goog.dom.getDocumentScroll_(document);
};
goog.dom.getDocumentScroll_ = function(doc) {
  var el = goog.dom.getDocumentScrollElement_(doc);
  var win = goog.dom.getWindow_(doc);
  if (goog.userAgent.IE && goog.userAgent.isVersionOrHigher("10") && win.pageYOffset != el.scrollTop) {
    return new goog.math.Coordinate(el.scrollLeft, el.scrollTop);
  }
  return new goog.math.Coordinate(win.pageXOffset || el.scrollLeft, win.pageYOffset || el.scrollTop);
};
goog.dom.getDocumentScrollElement = function() {
  return goog.dom.getDocumentScrollElement_(document);
};
goog.dom.getDocumentScrollElement_ = function(doc) {
  if (!goog.userAgent.WEBKIT && goog.dom.isCss1CompatMode_(doc)) {
    return doc.documentElement;
  }
  return doc.body || doc.documentElement;
};
goog.dom.getWindow = function(opt_doc) {
  return opt_doc ? goog.dom.getWindow_(opt_doc) : window;
};
goog.dom.getWindow_ = function(doc) {
  return doc.parentWindow || doc.defaultView;
};
goog.dom.createDom = function(tagName, opt_attributes, var_args) {
  return goog.dom.createDom_(document, arguments);
};
goog.dom.createDom_ = function(doc, args) {
  var tagName = args[0];
  var attributes = args[1];
  if (!goog.dom.BrowserFeature.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES && attributes && (attributes.name || attributes.type)) {
    var tagNameArr = ["<", tagName];
    if (attributes.name) {
      tagNameArr.push(' name="', goog.string.htmlEscape(attributes.name), '"');
    }
    if (attributes.type) {
      tagNameArr.push(' type="', goog.string.htmlEscape(attributes.type), '"');
      var clone = {};
      goog.object.extend(clone, attributes);
      delete clone["type"];
      attributes = clone;
    }
    tagNameArr.push(">");
    tagName = tagNameArr.join("");
  }
  var element = doc.createElement(tagName);
  if (attributes) {
    if (goog.isString(attributes)) {
      element.className = attributes;
    } else {
      if (goog.isArray(attributes)) {
        element.className = attributes.join(" ");
      } else {
        goog.dom.setProperties(element, attributes);
      }
    }
  }
  if (args.length > 2) {
    goog.dom.append_(doc, element, args, 2);
  }
  return element;
};
goog.dom.append_ = function(doc, parent, args, startIndex) {
  function childHandler(child) {
    if (child) {
      parent.appendChild(goog.isString(child) ? doc.createTextNode(child) : child);
    }
  }
  for (var i = startIndex;i < args.length;i++) {
    var arg = args[i];
    if (goog.isArrayLike(arg) && !goog.dom.isNodeLike(arg)) {
      goog.array.forEach(goog.dom.isNodeList(arg) ? goog.array.toArray(arg) : arg, childHandler);
    } else {
      childHandler(arg);
    }
  }
};
goog.dom.$dom = goog.dom.createDom;
goog.dom.createElement = function(name) {
  return document.createElement(name);
};
goog.dom.createTextNode = function(content) {
  return document.createTextNode(String(content));
};
goog.dom.createTable = function(rows, columns, opt_fillWithNbsp) {
  return goog.dom.createTable_(document, rows, columns, !!opt_fillWithNbsp);
};
goog.dom.createTable_ = function(doc, rows, columns, fillWithNbsp) {
  var table = (doc.createElement(goog.dom.TagName.TABLE));
  var tbody = table.appendChild(doc.createElement(goog.dom.TagName.TBODY));
  for (var i = 0;i < rows;i++) {
    var tr = doc.createElement(goog.dom.TagName.TR);
    for (var j = 0;j < columns;j++) {
      var td = doc.createElement(goog.dom.TagName.TD);
      if (fillWithNbsp) {
        goog.dom.setTextContent(td, goog.string.Unicode.NBSP);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  return table;
};
goog.dom.safeHtmlToNode = function(html) {
  return goog.dom.safeHtmlToNode_(document, html);
};
goog.dom.safeHtmlToNode_ = function(doc, html) {
  var tempDiv = doc.createElement("div");
  if (goog.dom.BrowserFeature.INNER_HTML_NEEDS_SCOPED_ELEMENT) {
    goog.dom.safe.setInnerHtml(tempDiv, goog.html.SafeHtml.concat(goog.html.SafeHtml.create("br"), html));
    tempDiv.removeChild(tempDiv.firstChild);
  } else {
    goog.dom.safe.setInnerHtml(tempDiv, html);
  }
  return goog.dom.childrenToNode_(doc, tempDiv);
};
goog.dom.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.htmlToDocumentFragment_(document, htmlString);
};
goog.dom.htmlToDocumentFragment_ = function(doc, htmlString) {
  var tempDiv = doc.createElement("div");
  if (goog.dom.BrowserFeature.INNER_HTML_NEEDS_SCOPED_ELEMENT) {
    tempDiv.innerHTML = "<br>" + htmlString;
    tempDiv.removeChild(tempDiv.firstChild);
  } else {
    tempDiv.innerHTML = htmlString;
  }
  return goog.dom.childrenToNode_(doc, tempDiv);
};
goog.dom.childrenToNode_ = function(doc, tempDiv) {
  if (tempDiv.childNodes.length == 1) {
    return(tempDiv.removeChild(tempDiv.firstChild));
  } else {
    var fragment = doc.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    return fragment;
  }
};
goog.dom.isCss1CompatMode = function() {
  return goog.dom.isCss1CompatMode_(document);
};
goog.dom.isCss1CompatMode_ = function(doc) {
  if (goog.dom.COMPAT_MODE_KNOWN_) {
    return goog.dom.ASSUME_STANDARDS_MODE;
  }
  return doc.compatMode == "CSS1Compat";
};
goog.dom.canHaveChildren = function(node) {
  if (node.nodeType != goog.dom.NodeType.ELEMENT) {
    return false;
  }
  switch(node.tagName) {
    case goog.dom.TagName.APPLET:
    ;
    case goog.dom.TagName.AREA:
    ;
    case goog.dom.TagName.BASE:
    ;
    case goog.dom.TagName.BR:
    ;
    case goog.dom.TagName.COL:
    ;
    case goog.dom.TagName.COMMAND:
    ;
    case goog.dom.TagName.EMBED:
    ;
    case goog.dom.TagName.FRAME:
    ;
    case goog.dom.TagName.HR:
    ;
    case goog.dom.TagName.IMG:
    ;
    case goog.dom.TagName.INPUT:
    ;
    case goog.dom.TagName.IFRAME:
    ;
    case goog.dom.TagName.ISINDEX:
    ;
    case goog.dom.TagName.KEYGEN:
    ;
    case goog.dom.TagName.LINK:
    ;
    case goog.dom.TagName.NOFRAMES:
    ;
    case goog.dom.TagName.NOSCRIPT:
    ;
    case goog.dom.TagName.META:
    ;
    case goog.dom.TagName.OBJECT:
    ;
    case goog.dom.TagName.PARAM:
    ;
    case goog.dom.TagName.SCRIPT:
    ;
    case goog.dom.TagName.SOURCE:
    ;
    case goog.dom.TagName.STYLE:
    ;
    case goog.dom.TagName.TRACK:
    ;
    case goog.dom.TagName.WBR:
      return false;
  }
  return true;
};
goog.dom.appendChild = function(parent, child) {
  parent.appendChild(child);
};
goog.dom.append = function(parent, var_args) {
  goog.dom.append_(goog.dom.getOwnerDocument(parent), parent, arguments, 1);
};
goog.dom.removeChildren = function(node) {
  var child;
  while (child = node.firstChild) {
    node.removeChild(child);
  }
};
goog.dom.insertSiblingBefore = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode);
  }
};
goog.dom.insertSiblingAfter = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }
};
goog.dom.insertChildAt = function(parent, child, index) {
  parent.insertBefore(child, parent.childNodes[index] || null);
};
goog.dom.removeNode = function(node) {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};
goog.dom.replaceNode = function(newNode, oldNode) {
  var parent = oldNode.parentNode;
  if (parent) {
    parent.replaceChild(newNode, oldNode);
  }
};
goog.dom.flattenElement = function(element) {
  var child, parent = element.parentNode;
  if (parent && parent.nodeType != goog.dom.NodeType.DOCUMENT_FRAGMENT) {
    if (element.removeNode) {
      return(element.removeNode(false));
    } else {
      while (child = element.firstChild) {
        parent.insertBefore(child, element);
      }
      return(goog.dom.removeNode(element));
    }
  }
};
goog.dom.getChildren = function(element) {
  if (goog.dom.BrowserFeature.CAN_USE_CHILDREN_ATTRIBUTE && element.children != undefined) {
    return element.children;
  }
  return goog.array.filter(element.childNodes, function(node) {
    return node.nodeType == goog.dom.NodeType.ELEMENT;
  });
};
goog.dom.getFirstElementChild = function(node) {
  if (node.firstElementChild != undefined) {
    return(node).firstElementChild;
  }
  return goog.dom.getNextElementNode_(node.firstChild, true);
};
goog.dom.getLastElementChild = function(node) {
  if (node.lastElementChild != undefined) {
    return(node).lastElementChild;
  }
  return goog.dom.getNextElementNode_(node.lastChild, false);
};
goog.dom.getNextElementSibling = function(node) {
  if (node.nextElementSibling != undefined) {
    return(node).nextElementSibling;
  }
  return goog.dom.getNextElementNode_(node.nextSibling, true);
};
goog.dom.getPreviousElementSibling = function(node) {
  if (node.previousElementSibling != undefined) {
    return(node).previousElementSibling;
  }
  return goog.dom.getNextElementNode_(node.previousSibling, false);
};
goog.dom.getNextElementNode_ = function(node, forward) {
  while (node && node.nodeType != goog.dom.NodeType.ELEMENT) {
    node = forward ? node.nextSibling : node.previousSibling;
  }
  return(node);
};
goog.dom.getNextNode = function(node) {
  if (!node) {
    return null;
  }
  if (node.firstChild) {
    return node.firstChild;
  }
  while (node && !node.nextSibling) {
    node = node.parentNode;
  }
  return node ? node.nextSibling : null;
};
goog.dom.getPreviousNode = function(node) {
  if (!node) {
    return null;
  }
  if (!node.previousSibling) {
    return node.parentNode;
  }
  node = node.previousSibling;
  while (node && node.lastChild) {
    node = node.lastChild;
  }
  return node;
};
goog.dom.isNodeLike = function(obj) {
  return goog.isObject(obj) && obj.nodeType > 0;
};
goog.dom.isElement = function(obj) {
  return goog.isObject(obj) && obj.nodeType == goog.dom.NodeType.ELEMENT;
};
goog.dom.isWindow = function(obj) {
  return goog.isObject(obj) && obj["window"] == obj;
};
goog.dom.getParentElement = function(element) {
  var parent;
  if (goog.dom.BrowserFeature.CAN_USE_PARENT_ELEMENT_PROPERTY) {
    var isIe9 = goog.userAgent.IE && goog.userAgent.isVersionOrHigher("9") && !goog.userAgent.isVersionOrHigher("10");
    if (!(isIe9 && goog.global["SVGElement"] && element instanceof goog.global["SVGElement"])) {
      parent = element.parentElement;
      if (parent) {
        return parent;
      }
    }
  }
  parent = element.parentNode;
  return goog.dom.isElement(parent) ? (parent) : null;
};
goog.dom.contains = function(parent, descendant) {
  if (parent.contains && descendant.nodeType == goog.dom.NodeType.ELEMENT) {
    return parent == descendant || parent.contains(descendant);
  }
  if (typeof parent.compareDocumentPosition != "undefined") {
    return parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);
  }
  while (descendant && parent != descendant) {
    descendant = descendant.parentNode;
  }
  return descendant == parent;
};
goog.dom.compareNodeOrder = function(node1, node2) {
  if (node1 == node2) {
    return 0;
  }
  if (node1.compareDocumentPosition) {
    return node1.compareDocumentPosition(node2) & 2 ? 1 : -1;
  }
  if (goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(9)) {
    if (node1.nodeType == goog.dom.NodeType.DOCUMENT) {
      return-1;
    }
    if (node2.nodeType == goog.dom.NodeType.DOCUMENT) {
      return 1;
    }
  }
  if ("sourceIndex" in node1 || node1.parentNode && "sourceIndex" in node1.parentNode) {
    var isElement1 = node1.nodeType == goog.dom.NodeType.ELEMENT;
    var isElement2 = node2.nodeType == goog.dom.NodeType.ELEMENT;
    if (isElement1 && isElement2) {
      return node1.sourceIndex - node2.sourceIndex;
    } else {
      var parent1 = node1.parentNode;
      var parent2 = node2.parentNode;
      if (parent1 == parent2) {
        return goog.dom.compareSiblingOrder_(node1, node2);
      }
      if (!isElement1 && goog.dom.contains(parent1, node2)) {
        return-1 * goog.dom.compareParentsDescendantNodeIe_(node1, node2);
      }
      if (!isElement2 && goog.dom.contains(parent2, node1)) {
        return goog.dom.compareParentsDescendantNodeIe_(node2, node1);
      }
      return(isElement1 ? node1.sourceIndex : parent1.sourceIndex) - (isElement2 ? node2.sourceIndex : parent2.sourceIndex);
    }
  }
  var doc = goog.dom.getOwnerDocument(node1);
  var range1, range2;
  range1 = doc.createRange();
  range1.selectNode(node1);
  range1.collapse(true);
  range2 = doc.createRange();
  range2.selectNode(node2);
  range2.collapse(true);
  return range1.compareBoundaryPoints(goog.global["Range"].START_TO_END, range2);
};
goog.dom.compareParentsDescendantNodeIe_ = function(textNode, node) {
  var parent = textNode.parentNode;
  if (parent == node) {
    return-1;
  }
  var sibling = node;
  while (sibling.parentNode != parent) {
    sibling = sibling.parentNode;
  }
  return goog.dom.compareSiblingOrder_(sibling, textNode);
};
goog.dom.compareSiblingOrder_ = function(node1, node2) {
  var s = node2;
  while (s = s.previousSibling) {
    if (s == node1) {
      return-1;
    }
  }
  return 1;
};
goog.dom.findCommonAncestor = function(var_args) {
  var i, count = arguments.length;
  if (!count) {
    return null;
  } else {
    if (count == 1) {
      return arguments[0];
    }
  }
  var paths = [];
  var minLength = Infinity;
  for (i = 0;i < count;i++) {
    var ancestors = [];
    var node = arguments[i];
    while (node) {
      ancestors.unshift(node);
      node = node.parentNode;
    }
    paths.push(ancestors);
    minLength = Math.min(minLength, ancestors.length);
  }
  var output = null;
  for (i = 0;i < minLength;i++) {
    var first = paths[0][i];
    for (var j = 1;j < count;j++) {
      if (first != paths[j][i]) {
        return output;
      }
    }
    output = first;
  }
  return output;
};
goog.dom.getOwnerDocument = function(node) {
  goog.asserts.assert(node, "Node cannot be null or undefined.");
  return(node.nodeType == goog.dom.NodeType.DOCUMENT ? node : node.ownerDocument || node.document);
};
goog.dom.getFrameContentDocument = function(frame) {
  var doc = frame.contentDocument || frame.contentWindow.document;
  return doc;
};
goog.dom.getFrameContentWindow = function(frame) {
  return frame.contentWindow || goog.dom.getWindow(goog.dom.getFrameContentDocument(frame));
};
goog.dom.setTextContent = function(node, text) {
  goog.asserts.assert(node != null, "goog.dom.setTextContent expects a non-null value for node");
  if ("textContent" in node) {
    node.textContent = text;
  } else {
    if (node.nodeType == goog.dom.NodeType.TEXT) {
      node.data = text;
    } else {
      if (node.firstChild && node.firstChild.nodeType == goog.dom.NodeType.TEXT) {
        while (node.lastChild != node.firstChild) {
          node.removeChild(node.lastChild);
        }
        node.firstChild.data = text;
      } else {
        goog.dom.removeChildren(node);
        var doc = goog.dom.getOwnerDocument(node);
        node.appendChild(doc.createTextNode(String(text)));
      }
    }
  }
};
goog.dom.getOuterHtml = function(element) {
  if ("outerHTML" in element) {
    return element.outerHTML;
  } else {
    var doc = goog.dom.getOwnerDocument(element);
    var div = doc.createElement("div");
    div.appendChild(element.cloneNode(true));
    return div.innerHTML;
  }
};
goog.dom.findNode = function(root, p) {
  var rv = [];
  var found = goog.dom.findNodes_(root, p, rv, true);
  return found ? rv[0] : undefined;
};
goog.dom.findNodes = function(root, p) {
  var rv = [];
  goog.dom.findNodes_(root, p, rv, false);
  return rv;
};
goog.dom.findNodes_ = function(root, p, rv, findOne) {
  if (root != null) {
    var child = root.firstChild;
    while (child) {
      if (p(child)) {
        rv.push(child);
        if (findOne) {
          return true;
        }
      }
      if (goog.dom.findNodes_(child, p, rv, findOne)) {
        return true;
      }
      child = child.nextSibling;
    }
  }
  return false;
};
goog.dom.TAGS_TO_IGNORE_ = {"SCRIPT":1, "STYLE":1, "HEAD":1, "IFRAME":1, "OBJECT":1};
goog.dom.PREDEFINED_TAG_VALUES_ = {"IMG":" ", "BR":"\n"};
goog.dom.isFocusableTabIndex = function(element) {
  return goog.dom.hasSpecifiedTabIndex_(element) && goog.dom.isTabIndexFocusable_(element);
};
goog.dom.setFocusableTabIndex = function(element, enable) {
  if (enable) {
    element.tabIndex = 0;
  } else {
    element.tabIndex = -1;
    element.removeAttribute("tabIndex");
  }
};
goog.dom.isFocusable = function(element) {
  var focusable;
  if (goog.dom.nativelySupportsFocus_(element)) {
    focusable = !element.disabled && (!goog.dom.hasSpecifiedTabIndex_(element) || goog.dom.isTabIndexFocusable_(element));
  } else {
    focusable = goog.dom.isFocusableTabIndex(element);
  }
  return focusable && goog.userAgent.IE ? goog.dom.hasNonZeroBoundingRect_(element) : focusable;
};
goog.dom.hasSpecifiedTabIndex_ = function(element) {
  var attrNode = element.getAttributeNode("tabindex");
  return goog.isDefAndNotNull(attrNode) && attrNode.specified;
};
goog.dom.isTabIndexFocusable_ = function(element) {
  var index = element.tabIndex;
  return goog.isNumber(index) && index >= 0 && index < 32768;
};
goog.dom.nativelySupportsFocus_ = function(element) {
  return element.tagName == goog.dom.TagName.A || element.tagName == goog.dom.TagName.INPUT || element.tagName == goog.dom.TagName.TEXTAREA || element.tagName == goog.dom.TagName.SELECT || element.tagName == goog.dom.TagName.BUTTON;
};
goog.dom.hasNonZeroBoundingRect_ = function(element) {
  var rect = goog.isFunction(element["getBoundingClientRect"]) ? element.getBoundingClientRect() : {"height":element.offsetHeight, "width":element.offsetWidth};
  return goog.isDefAndNotNull(rect) && rect.height > 0 && rect.width > 0;
};
goog.dom.getTextContent = function(node) {
  var textContent;
  if (goog.dom.BrowserFeature.CAN_USE_INNER_TEXT && "innerText" in node) {
    textContent = goog.string.canonicalizeNewlines(node.innerText);
  } else {
    var buf = [];
    goog.dom.getTextContent_(node, buf, true);
    textContent = buf.join("");
  }
  textContent = textContent.replace(/ \xAD /g, " ").replace(/\xAD/g, "");
  textContent = textContent.replace(/\u200B/g, "");
  if (!goog.dom.BrowserFeature.CAN_USE_INNER_TEXT) {
    textContent = textContent.replace(/ +/g, " ");
  }
  if (textContent != " ") {
    textContent = textContent.replace(/^\s*/, "");
  }
  return textContent;
};
goog.dom.getRawTextContent = function(node) {
  var buf = [];
  goog.dom.getTextContent_(node, buf, false);
  return buf.join("");
};
goog.dom.getTextContent_ = function(node, buf, normalizeWhitespace) {
  if (node.nodeName in goog.dom.TAGS_TO_IGNORE_) {
  } else {
    if (node.nodeType == goog.dom.NodeType.TEXT) {
      if (normalizeWhitespace) {
        buf.push(String(node.nodeValue).replace(/(\r\n|\r|\n)/g, ""));
      } else {
        buf.push(node.nodeValue);
      }
    } else {
      if (node.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
        buf.push(goog.dom.PREDEFINED_TAG_VALUES_[node.nodeName]);
      } else {
        var child = node.firstChild;
        while (child) {
          goog.dom.getTextContent_(child, buf, normalizeWhitespace);
          child = child.nextSibling;
        }
      }
    }
  }
};
goog.dom.getNodeTextLength = function(node) {
  return goog.dom.getTextContent(node).length;
};
goog.dom.getNodeTextOffset = function(node, opt_offsetParent) {
  var root = opt_offsetParent || goog.dom.getOwnerDocument(node).body;
  var buf = [];
  while (node && node != root) {
    var cur = node;
    while (cur = cur.previousSibling) {
      buf.unshift(goog.dom.getTextContent(cur));
    }
    node = node.parentNode;
  }
  return goog.string.trimLeft(buf.join("")).replace(/ +/g, " ").length;
};
goog.dom.getNodeAtOffset = function(parent, offset, opt_result) {
  var stack = [parent], pos = 0, cur = null;
  while (stack.length > 0 && pos < offset) {
    cur = stack.pop();
    if (cur.nodeName in goog.dom.TAGS_TO_IGNORE_) {
    } else {
      if (cur.nodeType == goog.dom.NodeType.TEXT) {
        var text = cur.nodeValue.replace(/(\r\n|\r|\n)/g, "").replace(/ +/g, " ");
        pos += text.length;
      } else {
        if (cur.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
          pos += goog.dom.PREDEFINED_TAG_VALUES_[cur.nodeName].length;
        } else {
          for (var i = cur.childNodes.length - 1;i >= 0;i--) {
            stack.push(cur.childNodes[i]);
          }
        }
      }
    }
  }
  if (goog.isObject(opt_result)) {
    opt_result.remainder = cur ? cur.nodeValue.length + offset - pos - 1 : 0;
    opt_result.node = cur;
  }
  return cur;
};
goog.dom.isNodeList = function(val) {
  if (val && typeof val.length == "number") {
    if (goog.isObject(val)) {
      return typeof val.item == "function" || typeof val.item == "string";
    } else {
      if (goog.isFunction(val)) {
        return typeof val.item == "function";
      }
    }
  }
  return false;
};
goog.dom.getAncestorByTagNameAndClass = function(element, opt_tag, opt_class, opt_maxSearchSteps) {
  if (!opt_tag && !opt_class) {
    return null;
  }
  var tagName = opt_tag ? opt_tag.toUpperCase() : null;
  return(goog.dom.getAncestor(element, function(node) {
    return(!tagName || node.nodeName == tagName) && (!opt_class || goog.isString(node.className) && goog.array.contains(node.className.split(/\s+/), opt_class));
  }, true, opt_maxSearchSteps));
};
goog.dom.getAncestorByClass = function(element, className, opt_maxSearchSteps) {
  return goog.dom.getAncestorByTagNameAndClass(element, null, className, opt_maxSearchSteps);
};
goog.dom.getAncestor = function(element, matcher, opt_includeNode, opt_maxSearchSteps) {
  if (!opt_includeNode) {
    element = element.parentNode;
  }
  var ignoreSearchSteps = opt_maxSearchSteps == null;
  var steps = 0;
  while (element && (ignoreSearchSteps || steps <= opt_maxSearchSteps)) {
    if (matcher(element)) {
      return element;
    }
    element = element.parentNode;
    steps++;
  }
  return null;
};
goog.dom.getActiveElement = function(doc) {
  try {
    return doc && doc.activeElement;
  } catch (e) {
  }
  return null;
};
goog.dom.getPixelRatio = function() {
  var win = goog.dom.getWindow();
  var isFirefoxMobile = goog.userAgent.GECKO && goog.userAgent.MOBILE;
  if (goog.isDef(win.devicePixelRatio) && !isFirefoxMobile) {
    return win.devicePixelRatio;
  } else {
    if (win.matchMedia) {
      return goog.dom.matchesPixelRatio_(.75) || goog.dom.matchesPixelRatio_(1.5) || goog.dom.matchesPixelRatio_(2) || goog.dom.matchesPixelRatio_(3) || 1;
    }
  }
  return 1;
};
goog.dom.matchesPixelRatio_ = function(pixelRatio) {
  var win = goog.dom.getWindow();
  var query = "(-webkit-min-device-pixel-ratio: " + pixelRatio + ")," + "(min--moz-device-pixel-ratio: " + pixelRatio + ")," + "(min-resolution: " + pixelRatio + "dppx)";
  return win.matchMedia(query).matches ? pixelRatio : 0;
};
goog.dom.DomHelper = function(opt_document) {
  this.document_ = opt_document || goog.global.document || document;
};
goog.dom.DomHelper.prototype.getDomHelper = goog.dom.getDomHelper;
goog.dom.DomHelper.prototype.setDocument = function(document) {
  this.document_ = document;
};
goog.dom.DomHelper.prototype.getDocument = function() {
  return this.document_;
};
goog.dom.DomHelper.prototype.getElement = function(element) {
  return goog.dom.getElementHelper_(this.document_, element);
};
goog.dom.DomHelper.prototype.getRequiredElement = function(id) {
  return goog.dom.getRequiredElementHelper_(this.document_, id);
};
goog.dom.DomHelper.prototype.$ = goog.dom.DomHelper.prototype.getElement;
goog.dom.DomHelper.prototype.getElementsByTagNameAndClass = function(opt_tag, opt_class, opt_el) {
  return goog.dom.getElementsByTagNameAndClass_(this.document_, opt_tag, opt_class, opt_el);
};
goog.dom.DomHelper.prototype.getElementsByClass = function(className, opt_el) {
  var doc = opt_el || this.document_;
  return goog.dom.getElementsByClass(className, doc);
};
goog.dom.DomHelper.prototype.getElementByClass = function(className, opt_el) {
  var doc = opt_el || this.document_;
  return goog.dom.getElementByClass(className, doc);
};
goog.dom.DomHelper.prototype.getRequiredElementByClass = function(className, opt_root) {
  var root = opt_root || this.document_;
  return goog.dom.getRequiredElementByClass(className, root);
};
goog.dom.DomHelper.prototype.$$ = goog.dom.DomHelper.prototype.getElementsByTagNameAndClass;
goog.dom.DomHelper.prototype.setProperties = goog.dom.setProperties;
goog.dom.DomHelper.prototype.getViewportSize = function(opt_window) {
  return goog.dom.getViewportSize(opt_window || this.getWindow());
};
goog.dom.DomHelper.prototype.getDocumentHeight = function() {
  return goog.dom.getDocumentHeight_(this.getWindow());
};
goog.dom.Appendable;
goog.dom.DomHelper.prototype.createDom = function(tagName, opt_attributes, var_args) {
  return goog.dom.createDom_(this.document_, arguments);
};
goog.dom.DomHelper.prototype.$dom = goog.dom.DomHelper.prototype.createDom;
goog.dom.DomHelper.prototype.createElement = function(name) {
  return this.document_.createElement(name);
};
goog.dom.DomHelper.prototype.createTextNode = function(content) {
  return this.document_.createTextNode(String(content));
};
goog.dom.DomHelper.prototype.createTable = function(rows, columns, opt_fillWithNbsp) {
  return goog.dom.createTable_(this.document_, rows, columns, !!opt_fillWithNbsp);
};
goog.dom.DomHelper.prototype.safeHtmlToNode = function(html) {
  return goog.dom.safeHtmlToNode_(this.document_, html);
};
goog.dom.DomHelper.prototype.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.htmlToDocumentFragment_(this.document_, htmlString);
};
goog.dom.DomHelper.prototype.isCss1CompatMode = function() {
  return goog.dom.isCss1CompatMode_(this.document_);
};
goog.dom.DomHelper.prototype.getWindow = function() {
  return goog.dom.getWindow_(this.document_);
};
goog.dom.DomHelper.prototype.getDocumentScrollElement = function() {
  return goog.dom.getDocumentScrollElement_(this.document_);
};
goog.dom.DomHelper.prototype.getDocumentScroll = function() {
  return goog.dom.getDocumentScroll_(this.document_);
};
goog.dom.DomHelper.prototype.getActiveElement = function(opt_doc) {
  return goog.dom.getActiveElement(opt_doc || this.document_);
};
goog.dom.DomHelper.prototype.appendChild = goog.dom.appendChild;
goog.dom.DomHelper.prototype.append = goog.dom.append;
goog.dom.DomHelper.prototype.canHaveChildren = goog.dom.canHaveChildren;
goog.dom.DomHelper.prototype.removeChildren = goog.dom.removeChildren;
goog.dom.DomHelper.prototype.insertSiblingBefore = goog.dom.insertSiblingBefore;
goog.dom.DomHelper.prototype.insertSiblingAfter = goog.dom.insertSiblingAfter;
goog.dom.DomHelper.prototype.insertChildAt = goog.dom.insertChildAt;
goog.dom.DomHelper.prototype.removeNode = goog.dom.removeNode;
goog.dom.DomHelper.prototype.replaceNode = goog.dom.replaceNode;
goog.dom.DomHelper.prototype.flattenElement = goog.dom.flattenElement;
goog.dom.DomHelper.prototype.getChildren = goog.dom.getChildren;
goog.dom.DomHelper.prototype.getFirstElementChild = goog.dom.getFirstElementChild;
goog.dom.DomHelper.prototype.getLastElementChild = goog.dom.getLastElementChild;
goog.dom.DomHelper.prototype.getNextElementSibling = goog.dom.getNextElementSibling;
goog.dom.DomHelper.prototype.getPreviousElementSibling = goog.dom.getPreviousElementSibling;
goog.dom.DomHelper.prototype.getNextNode = goog.dom.getNextNode;
goog.dom.DomHelper.prototype.getPreviousNode = goog.dom.getPreviousNode;
goog.dom.DomHelper.prototype.isNodeLike = goog.dom.isNodeLike;
goog.dom.DomHelper.prototype.isElement = goog.dom.isElement;
goog.dom.DomHelper.prototype.isWindow = goog.dom.isWindow;
goog.dom.DomHelper.prototype.getParentElement = goog.dom.getParentElement;
goog.dom.DomHelper.prototype.contains = goog.dom.contains;
goog.dom.DomHelper.prototype.compareNodeOrder = goog.dom.compareNodeOrder;
goog.dom.DomHelper.prototype.findCommonAncestor = goog.dom.findCommonAncestor;
goog.dom.DomHelper.prototype.getOwnerDocument = goog.dom.getOwnerDocument;
goog.dom.DomHelper.prototype.getFrameContentDocument = goog.dom.getFrameContentDocument;
goog.dom.DomHelper.prototype.getFrameContentWindow = goog.dom.getFrameContentWindow;
goog.dom.DomHelper.prototype.setTextContent = goog.dom.setTextContent;
goog.dom.DomHelper.prototype.getOuterHtml = goog.dom.getOuterHtml;
goog.dom.DomHelper.prototype.findNode = goog.dom.findNode;
goog.dom.DomHelper.prototype.findNodes = goog.dom.findNodes;
goog.dom.DomHelper.prototype.isFocusableTabIndex = goog.dom.isFocusableTabIndex;
goog.dom.DomHelper.prototype.setFocusableTabIndex = goog.dom.setFocusableTabIndex;
goog.dom.DomHelper.prototype.isFocusable = goog.dom.isFocusable;
goog.dom.DomHelper.prototype.getTextContent = goog.dom.getTextContent;
goog.dom.DomHelper.prototype.getNodeTextLength = goog.dom.getNodeTextLength;
goog.dom.DomHelper.prototype.getNodeTextOffset = goog.dom.getNodeTextOffset;
goog.dom.DomHelper.prototype.getNodeAtOffset = goog.dom.getNodeAtOffset;
goog.dom.DomHelper.prototype.isNodeList = goog.dom.isNodeList;
goog.dom.DomHelper.prototype.getAncestorByTagNameAndClass = goog.dom.getAncestorByTagNameAndClass;
goog.dom.DomHelper.prototype.getAncestorByClass = goog.dom.getAncestorByClass;
goog.dom.DomHelper.prototype.getAncestor = goog.dom.getAncestor;
goog.provide("goog.dom.classes");
goog.require("goog.array");
goog.dom.classes.set = function(element, className) {
  element.className = className;
};
goog.dom.classes.get = function(element) {
  var className = element.className;
  return goog.isString(className) && className.match(/\S+/g) || [];
};
goog.dom.classes.add = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);
  var expectedCount = classes.length + args.length;
  goog.dom.classes.add_(classes, args);
  goog.dom.classes.set(element, classes.join(" "));
  return classes.length == expectedCount;
};
goog.dom.classes.remove = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);
  var newClasses = goog.dom.classes.getDifference_(classes, args);
  goog.dom.classes.set(element, newClasses.join(" "));
  return newClasses.length == classes.length - args.length;
};
goog.dom.classes.add_ = function(classes, args) {
  for (var i = 0;i < args.length;i++) {
    if (!goog.array.contains(classes, args[i])) {
      classes.push(args[i]);
    }
  }
};
goog.dom.classes.getDifference_ = function(arr1, arr2) {
  return goog.array.filter(arr1, function(item) {
    return!goog.array.contains(arr2, item);
  });
};
goog.dom.classes.swap = function(element, fromClass, toClass) {
  var classes = goog.dom.classes.get(element);
  var removed = false;
  for (var i = 0;i < classes.length;i++) {
    if (classes[i] == fromClass) {
      goog.array.splice(classes, i--, 1);
      removed = true;
    }
  }
  if (removed) {
    classes.push(toClass);
    goog.dom.classes.set(element, classes.join(" "));
  }
  return removed;
};
goog.dom.classes.addRemove = function(element, classesToRemove, classesToAdd) {
  var classes = goog.dom.classes.get(element);
  if (goog.isString(classesToRemove)) {
    goog.array.remove(classes, classesToRemove);
  } else {
    if (goog.isArray(classesToRemove)) {
      classes = goog.dom.classes.getDifference_(classes, classesToRemove);
    }
  }
  if (goog.isString(classesToAdd) && !goog.array.contains(classes, classesToAdd)) {
    classes.push(classesToAdd);
  } else {
    if (goog.isArray(classesToAdd)) {
      goog.dom.classes.add_(classes, classesToAdd);
    }
  }
  goog.dom.classes.set(element, classes.join(" "));
};
goog.dom.classes.has = function(element, className) {
  return goog.array.contains(goog.dom.classes.get(element), className);
};
goog.dom.classes.enable = function(element, className, enabled) {
  if (enabled) {
    goog.dom.classes.add(element, className);
  } else {
    goog.dom.classes.remove(element, className);
  }
};
goog.dom.classes.toggle = function(element, className) {
  var add = !goog.dom.classes.has(element, className);
  goog.dom.classes.enable(element, className, add);
  return add;
};
goog.provide("goog.style");
goog.require("goog.array");
goog.require("goog.asserts");
goog.require("goog.dom");
goog.require("goog.dom.NodeType");
goog.require("goog.dom.vendor");
goog.require("goog.math.Box");
goog.require("goog.math.Coordinate");
goog.require("goog.math.Rect");
goog.require("goog.math.Size");
goog.require("goog.object");
goog.require("goog.string");
goog.require("goog.userAgent");
goog.define("goog.style.GET_BOUNDING_CLIENT_RECT_ALWAYS_EXISTS", false);
goog.style.setStyle = function(element, style, opt_value) {
  if (goog.isString(style)) {
    goog.style.setStyle_(element, opt_value, style);
  } else {
    for (var key in style) {
      goog.style.setStyle_(element, style[key], key);
    }
  }
};
goog.style.setStyle_ = function(element, value, style) {
  var propertyName = goog.style.getVendorJsStyleName_(element, style);
  if (propertyName) {
    element.style[propertyName] = value;
  }
};
goog.style.styleNameCache_ = {};
goog.style.getVendorJsStyleName_ = function(element, style) {
  var propertyName = goog.style.styleNameCache_[style];
  if (!propertyName) {
    var camelStyle = goog.string.toCamelCase(style);
    propertyName = camelStyle;
    if (element.style[camelStyle] === undefined) {
      var prefixedStyle = goog.dom.vendor.getVendorJsPrefix() + goog.string.toTitleCase(camelStyle);
      if (element.style[prefixedStyle] !== undefined) {
        propertyName = prefixedStyle;
      }
    }
    goog.style.styleNameCache_[style] = propertyName;
  }
  return propertyName;
};
goog.style.getVendorStyleName_ = function(element, style) {
  var camelStyle = goog.string.toCamelCase(style);
  if (element.style[camelStyle] === undefined) {
    var prefixedStyle = goog.dom.vendor.getVendorJsPrefix() + goog.string.toTitleCase(camelStyle);
    if (element.style[prefixedStyle] !== undefined) {
      return goog.dom.vendor.getVendorPrefix() + "-" + style;
    }
  }
  return style;
};
goog.style.getStyle = function(element, property) {
  var styleValue = element.style[goog.string.toCamelCase(property)];
  if (typeof styleValue !== "undefined") {
    return styleValue;
  }
  return element.style[goog.style.getVendorJsStyleName_(element, property)] || "";
};
goog.style.getComputedStyle = function(element, property) {
  var doc = goog.dom.getOwnerDocument(element);
  if (doc.defaultView && doc.defaultView.getComputedStyle) {
    var styles = doc.defaultView.getComputedStyle(element, null);
    if (styles) {
      return styles[property] || styles.getPropertyValue(property) || "";
    }
  }
  return "";
};
goog.style.getCascadedStyle = function(element, style) {
  return element.currentStyle ? element.currentStyle[style] : null;
};
goog.style.getStyle_ = function(element, style) {
  return goog.style.getComputedStyle(element, style) || goog.style.getCascadedStyle(element, style) || element.style && element.style[style];
};
goog.style.getComputedBoxSizing = function(element) {
  return goog.style.getStyle_(element, "boxSizing") || goog.style.getStyle_(element, "MozBoxSizing") || goog.style.getStyle_(element, "WebkitBoxSizing") || null;
};
goog.style.getComputedPosition = function(element) {
  return goog.style.getStyle_(element, "position");
};
goog.style.getBackgroundColor = function(element) {
  return goog.style.getStyle_(element, "backgroundColor");
};
goog.style.getComputedOverflowX = function(element) {
  return goog.style.getStyle_(element, "overflowX");
};
goog.style.getComputedOverflowY = function(element) {
  return goog.style.getStyle_(element, "overflowY");
};
goog.style.getComputedZIndex = function(element) {
  return goog.style.getStyle_(element, "zIndex");
};
goog.style.getComputedTextAlign = function(element) {
  return goog.style.getStyle_(element, "textAlign");
};
goog.style.getComputedCursor = function(element) {
  return goog.style.getStyle_(element, "cursor");
};
goog.style.getComputedTransform = function(element) {
  var property = goog.style.getVendorStyleName_(element, "transform");
  return goog.style.getStyle_(element, property) || goog.style.getStyle_(element, "transform");
};
goog.style.setPosition = function(el, arg1, opt_arg2) {
  var x, y;
  var buggyGeckoSubPixelPos = goog.userAgent.GECKO && (goog.userAgent.MAC || goog.userAgent.X11) && goog.userAgent.isVersionOrHigher("1.9");
  if (arg1 instanceof goog.math.Coordinate) {
    x = arg1.x;
    y = arg1.y;
  } else {
    x = arg1;
    y = opt_arg2;
  }
  el.style.left = goog.style.getPixelStyleValue_((x), buggyGeckoSubPixelPos);
  el.style.top = goog.style.getPixelStyleValue_((y), buggyGeckoSubPixelPos);
};
goog.style.getPosition = function(element) {
  return new goog.math.Coordinate(element.offsetLeft, element.offsetTop);
};
goog.style.getClientViewportElement = function(opt_node) {
  var doc;
  if (opt_node) {
    doc = goog.dom.getOwnerDocument(opt_node);
  } else {
    doc = goog.dom.getDocument();
  }
  if (goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(9) && !goog.dom.getDomHelper(doc).isCss1CompatMode()) {
    return doc.body;
  }
  return doc.documentElement;
};
goog.style.getViewportPageOffset = function(doc) {
  var body = doc.body;
  var documentElement = doc.documentElement;
  var scrollLeft = body.scrollLeft || documentElement.scrollLeft;
  var scrollTop = body.scrollTop || documentElement.scrollTop;
  return new goog.math.Coordinate(scrollLeft, scrollTop);
};
goog.style.getBoundingClientRect_ = function(el) {
  var rect;
  try {
    rect = el.getBoundingClientRect();
  } catch (e) {
    return{"left":0, "top":0, "right":0, "bottom":0};
  }
  if (goog.userAgent.IE && el.ownerDocument.body) {
    var doc = el.ownerDocument;
    rect.left -= doc.documentElement.clientLeft + doc.body.clientLeft;
    rect.top -= doc.documentElement.clientTop + doc.body.clientTop;
  }
  return(rect);
};
goog.style.getOffsetParent = function(element) {
  if (goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(8)) {
    return element.offsetParent;
  }
  var doc = goog.dom.getOwnerDocument(element);
  var positionStyle = goog.style.getStyle_(element, "position");
  var skipStatic = positionStyle == "fixed" || positionStyle == "absolute";
  for (var parent = element.parentNode;parent && parent != doc;parent = parent.parentNode) {
    positionStyle = goog.style.getStyle_((parent), "position");
    skipStatic = skipStatic && positionStyle == "static" && parent != doc.documentElement && parent != doc.body;
    if (!skipStatic && (parent.scrollWidth > parent.clientWidth || parent.scrollHeight > parent.clientHeight || positionStyle == "fixed" || positionStyle == "absolute" || positionStyle == "relative")) {
      return(parent);
    }
  }
  return null;
};
goog.style.getVisibleRectForElement = function(element) {
  var visibleRect = new goog.math.Box(0, Infinity, Infinity, 0);
  var dom = goog.dom.getDomHelper(element);
  var body = dom.getDocument().body;
  var documentElement = dom.getDocument().documentElement;
  var scrollEl = dom.getDocumentScrollElement();
  for (var el = element;el = goog.style.getOffsetParent(el);) {
    if ((!goog.userAgent.IE || el.clientWidth != 0) && (!goog.userAgent.WEBKIT || el.clientHeight != 0 || el != body) && (el != body && el != documentElement && goog.style.getStyle_(el, "overflow") != "visible")) {
      var pos = goog.style.getPageOffset(el);
      var client = goog.style.getClientLeftTop(el);
      pos.x += client.x;
      pos.y += client.y;
      visibleRect.top = Math.max(visibleRect.top, pos.y);
      visibleRect.right = Math.min(visibleRect.right, pos.x + el.clientWidth);
      visibleRect.bottom = Math.min(visibleRect.bottom, pos.y + el.clientHeight);
      visibleRect.left = Math.max(visibleRect.left, pos.x);
    }
  }
  var scrollX = scrollEl.scrollLeft, scrollY = scrollEl.scrollTop;
  visibleRect.left = Math.max(visibleRect.left, scrollX);
  visibleRect.top = Math.max(visibleRect.top, scrollY);
  var winSize = dom.getViewportSize();
  visibleRect.right = Math.min(visibleRect.right, scrollX + winSize.width);
  visibleRect.bottom = Math.min(visibleRect.bottom, scrollY + winSize.height);
  return visibleRect.top >= 0 && visibleRect.left >= 0 && visibleRect.bottom > visibleRect.top && visibleRect.right > visibleRect.left ? visibleRect : null;
};
goog.style.getContainerOffsetToScrollInto = function(element, container, opt_center) {
  var elementPos = goog.style.getPageOffset(element);
  var containerPos = goog.style.getPageOffset(container);
  var containerBorder = goog.style.getBorderBox(container);
  var relX = elementPos.x - containerPos.x - containerBorder.left;
  var relY = elementPos.y - containerPos.y - containerBorder.top;
  var spaceX = container.clientWidth - element.offsetWidth;
  var spaceY = container.clientHeight - element.offsetHeight;
  var scrollLeft = container.scrollLeft;
  var scrollTop = container.scrollTop;
  if (opt_center) {
    scrollLeft += relX - spaceX / 2;
    scrollTop += relY - spaceY / 2;
  } else {
    scrollLeft += Math.min(relX, Math.max(relX - spaceX, 0));
    scrollTop += Math.min(relY, Math.max(relY - spaceY, 0));
  }
  return new goog.math.Coordinate(scrollLeft, scrollTop);
};
goog.style.scrollIntoContainerView = function(element, container, opt_center) {
  var offset = goog.style.getContainerOffsetToScrollInto(element, container, opt_center);
  container.scrollLeft = offset.x;
  container.scrollTop = offset.y;
};
goog.style.getClientLeftTop = function(el) {
  if (goog.userAgent.GECKO && !goog.userAgent.isVersionOrHigher("1.9")) {
    var left = parseFloat(goog.style.getComputedStyle(el, "borderLeftWidth"));
    if (goog.style.isRightToLeft(el)) {
      var scrollbarWidth = el.offsetWidth - el.clientWidth - left - parseFloat(goog.style.getComputedStyle(el, "borderRightWidth"));
      left += scrollbarWidth;
    }
    return new goog.math.Coordinate(left, parseFloat(goog.style.getComputedStyle(el, "borderTopWidth")));
  }
  return new goog.math.Coordinate(el.clientLeft, el.clientTop);
};
goog.style.getPageOffset = function(el) {
  var box, doc = goog.dom.getOwnerDocument(el);
  var positionStyle = goog.style.getStyle_(el, "position");
  goog.asserts.assertObject(el, "Parameter is required");
  var BUGGY_GECKO_BOX_OBJECT = !goog.style.GET_BOUNDING_CLIENT_RECT_ALWAYS_EXISTS && goog.userAgent.GECKO && doc.getBoxObjectFor && !el.getBoundingClientRect && positionStyle == "absolute" && (box = doc.getBoxObjectFor(el)) && (box.screenX < 0 || box.screenY < 0);
  var pos = new goog.math.Coordinate(0, 0);
  var viewportElement = goog.style.getClientViewportElement(doc);
  if (el == viewportElement) {
    return pos;
  }
  if (goog.style.GET_BOUNDING_CLIENT_RECT_ALWAYS_EXISTS || el.getBoundingClientRect) {
    box = goog.style.getBoundingClientRect_(el);
    var scrollCoord = goog.dom.getDomHelper(doc).getDocumentScroll();
    pos.x = box.left + scrollCoord.x;
    pos.y = box.top + scrollCoord.y;
  } else {
    if (doc.getBoxObjectFor && !BUGGY_GECKO_BOX_OBJECT) {
      box = doc.getBoxObjectFor(el);
      var vpBox = doc.getBoxObjectFor(viewportElement);
      pos.x = box.screenX - vpBox.screenX;
      pos.y = box.screenY - vpBox.screenY;
    } else {
      var parent = el;
      do {
        pos.x += parent.offsetLeft;
        pos.y += parent.offsetTop;
        if (parent != el) {
          pos.x += parent.clientLeft || 0;
          pos.y += parent.clientTop || 0;
        }
        if (goog.userAgent.WEBKIT && goog.style.getComputedPosition(parent) == "fixed") {
          pos.x += doc.body.scrollLeft;
          pos.y += doc.body.scrollTop;
          break;
        }
        parent = parent.offsetParent;
      } while (parent && parent != el);
      if (goog.userAgent.OPERA || goog.userAgent.WEBKIT && positionStyle == "absolute") {
        pos.y -= doc.body.offsetTop;
      }
      for (parent = el;(parent = goog.style.getOffsetParent(parent)) && parent != doc.body && parent != viewportElement;) {
        pos.x -= parent.scrollLeft;
        if (!goog.userAgent.OPERA || parent.tagName != "TR") {
          pos.y -= parent.scrollTop;
        }
      }
    }
  }
  return pos;
};
goog.style.getPageOffsetLeft = function(el) {
  return goog.style.getPageOffset(el).x;
};
goog.style.getPageOffsetTop = function(el) {
  return goog.style.getPageOffset(el).y;
};
goog.style.getFramedPageOffset = function(el, relativeWin) {
  var position = new goog.math.Coordinate(0, 0);
  var currentWin = goog.dom.getWindow(goog.dom.getOwnerDocument(el));
  var currentEl = el;
  do {
    var offset = currentWin == relativeWin ? goog.style.getPageOffset(currentEl) : goog.style.getClientPositionForElement_(goog.asserts.assert(currentEl));
    position.x += offset.x;
    position.y += offset.y;
  } while (currentWin && currentWin != relativeWin && (currentEl = currentWin.frameElement) && (currentWin = currentWin.parent));
  return position;
};
goog.style.translateRectForAnotherFrame = function(rect, origBase, newBase) {
  if (origBase.getDocument() != newBase.getDocument()) {
    var body = origBase.getDocument().body;
    var pos = goog.style.getFramedPageOffset(body, newBase.getWindow());
    pos = goog.math.Coordinate.difference(pos, goog.style.getPageOffset(body));
    if (goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(9) && !origBase.isCss1CompatMode()) {
      pos = goog.math.Coordinate.difference(pos, origBase.getDocumentScroll());
    }
    rect.left += pos.x;
    rect.top += pos.y;
  }
};
goog.style.getRelativePosition = function(a, b) {
  var ap = goog.style.getClientPosition(a);
  var bp = goog.style.getClientPosition(b);
  return new goog.math.Coordinate(ap.x - bp.x, ap.y - bp.y);
};
goog.style.getClientPositionForElement_ = function(el) {
  var pos;
  if (goog.style.GET_BOUNDING_CLIENT_RECT_ALWAYS_EXISTS || el.getBoundingClientRect) {
    var box = goog.style.getBoundingClientRect_(el);
    pos = new goog.math.Coordinate(box.left, box.top);
  } else {
    var scrollCoord = goog.dom.getDomHelper(el).getDocumentScroll();
    var pageCoord = goog.style.getPageOffset(el);
    pos = new goog.math.Coordinate(pageCoord.x - scrollCoord.x, pageCoord.y - scrollCoord.y);
  }
  if (goog.userAgent.GECKO && !goog.userAgent.isVersionOrHigher(12)) {
    return goog.math.Coordinate.sum(pos, goog.style.getCssTranslation(el));
  } else {
    return pos;
  }
};
goog.style.getClientPosition = function(el) {
  goog.asserts.assert(el);
  if (el.nodeType == goog.dom.NodeType.ELEMENT) {
    return goog.style.getClientPositionForElement_((el));
  } else {
    var isAbstractedEvent = goog.isFunction(el.getBrowserEvent);
    var be = (el);
    var targetEvent = el;
    if (el.targetTouches && el.targetTouches.length) {
      targetEvent = el.targetTouches[0];
    } else {
      if (isAbstractedEvent && be.getBrowserEvent().targetTouches && be.getBrowserEvent().targetTouches.length) {
        targetEvent = be.getBrowserEvent().targetTouches[0];
      }
    }
    return new goog.math.Coordinate(targetEvent.clientX, targetEvent.clientY);
  }
};
goog.style.setPageOffset = function(el, x, opt_y) {
  var cur = goog.style.getPageOffset(el);
  if (x instanceof goog.math.Coordinate) {
    opt_y = x.y;
    x = x.x;
  }
  var dx = x - cur.x;
  var dy = opt_y - cur.y;
  goog.style.setPosition(el, el.offsetLeft + dx, el.offsetTop + dy);
};
goog.style.setSize = function(element, w, opt_h) {
  var h;
  if (w instanceof goog.math.Size) {
    h = w.height;
    w = w.width;
  } else {
    if (opt_h == undefined) {
      throw Error("missing height argument");
    }
    h = opt_h;
  }
  goog.style.setWidth(element, (w));
  goog.style.setHeight(element, (h));
};
goog.style.getPixelStyleValue_ = function(value, round) {
  if (typeof value == "number") {
    value = (round ? Math.round(value) : value) + "px";
  }
  return value;
};
goog.style.setHeight = function(element, height) {
  element.style.height = goog.style.getPixelStyleValue_(height, true);
};
goog.style.setWidth = function(element, width) {
  element.style.width = goog.style.getPixelStyleValue_(width, true);
};
goog.style.getSize = function(element) {
  return goog.style.evaluateWithTemporaryDisplay_(goog.style.getSizeWithDisplay_, (element));
};
goog.style.evaluateWithTemporaryDisplay_ = function(fn, element) {
  if (goog.style.getStyle_(element, "display") != "none") {
    return fn(element);
  }
  var style = element.style;
  var originalDisplay = style.display;
  var originalVisibility = style.visibility;
  var originalPosition = style.position;
  style.visibility = "hidden";
  style.position = "absolute";
  style.display = "inline";
  var retVal = fn(element);
  style.display = originalDisplay;
  style.position = originalPosition;
  style.visibility = originalVisibility;
  return retVal;
};
goog.style.getSizeWithDisplay_ = function(element) {
  var offsetWidth = element.offsetWidth;
  var offsetHeight = element.offsetHeight;
  var webkitOffsetsZero = goog.userAgent.WEBKIT && !offsetWidth && !offsetHeight;
  if ((!goog.isDef(offsetWidth) || webkitOffsetsZero) && element.getBoundingClientRect) {
    var clientRect = goog.style.getBoundingClientRect_(element);
    return new goog.math.Size(clientRect.right - clientRect.left, clientRect.bottom - clientRect.top);
  }
  return new goog.math.Size(offsetWidth, offsetHeight);
};
goog.style.getTransformedSize = function(element) {
  if (!element.getBoundingClientRect) {
    return null;
  }
  var clientRect = goog.style.evaluateWithTemporaryDisplay_(goog.style.getBoundingClientRect_, element);
  return new goog.math.Size(clientRect.right - clientRect.left, clientRect.bottom - clientRect.top);
};
goog.style.getBounds = function(element) {
  var o = goog.style.getPageOffset(element);
  var s = goog.style.getSize(element);
  return new goog.math.Rect(o.x, o.y, s.width, s.height);
};
goog.style.toCamelCase = function(selector) {
  return goog.string.toCamelCase(String(selector));
};
goog.style.toSelectorCase = function(selector) {
  return goog.string.toSelectorCase(selector);
};
goog.style.getOpacity = function(el) {
  var style = el.style;
  var result = "";
  if ("opacity" in style) {
    result = style.opacity;
  } else {
    if ("MozOpacity" in style) {
      result = style.MozOpacity;
    } else {
      if ("filter" in style) {
        var match = style.filter.match(/alpha\(opacity=([\d.]+)\)/);
        if (match) {
          result = String(match[1] / 100);
        }
      }
    }
  }
  return result == "" ? result : Number(result);
};
goog.style.setOpacity = function(el, alpha) {
  var style = el.style;
  if ("opacity" in style) {
    style.opacity = alpha;
  } else {
    if ("MozOpacity" in style) {
      style.MozOpacity = alpha;
    } else {
      if ("filter" in style) {
        if (alpha === "") {
          style.filter = "";
        } else {
          style.filter = "alpha(opacity=" + alpha * 100 + ")";
        }
      }
    }
  }
};
goog.style.setTransparentBackgroundImage = function(el, src) {
  var style = el.style;
  if (goog.userAgent.IE && !goog.userAgent.isVersionOrHigher("8")) {
    style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(" + 'src="' + src + '", sizingMethod="crop")';
  } else {
    style.backgroundImage = "url(" + src + ")";
    style.backgroundPosition = "top left";
    style.backgroundRepeat = "no-repeat";
  }
};
goog.style.clearTransparentBackgroundImage = function(el) {
  var style = el.style;
  if ("filter" in style) {
    style.filter = "";
  } else {
    style.backgroundImage = "none";
  }
};
goog.style.showElement = function(el, display) {
  goog.style.setElementShown(el, display);
};
goog.style.setElementShown = function(el, isShown) {
  el.style.display = isShown ? "" : "none";
};
goog.style.isElementShown = function(el) {
  return el.style.display != "none";
};
goog.style.installStyles = function(stylesString, opt_node) {
  var dh = goog.dom.getDomHelper(opt_node);
  var styleSheet = null;
  var doc = dh.getDocument();
  if (goog.userAgent.IE && doc.createStyleSheet) {
    styleSheet = doc.createStyleSheet();
    goog.style.setStyles(styleSheet, stylesString);
  } else {
    var head = dh.getElementsByTagNameAndClass("head")[0];
    if (!head) {
      var body = dh.getElementsByTagNameAndClass("body")[0];
      head = dh.createDom("head");
      body.parentNode.insertBefore(head, body);
    }
    styleSheet = dh.createDom("style");
    goog.style.setStyles(styleSheet, stylesString);
    dh.appendChild(head, styleSheet);
  }
  return styleSheet;
};
goog.style.uninstallStyles = function(styleSheet) {
  var node = styleSheet.ownerNode || styleSheet.owningElement || (styleSheet);
  goog.dom.removeNode(node);
};
goog.style.setStyles = function(element, stylesString) {
  if (goog.userAgent.IE && goog.isDef(element.cssText)) {
    element.cssText = stylesString;
  } else {
    element.innerHTML = stylesString;
  }
};
goog.style.setPreWrap = function(el) {
  var style = el.style;
  if (goog.userAgent.IE && !goog.userAgent.isVersionOrHigher("8")) {
    style.whiteSpace = "pre";
    style.wordWrap = "break-word";
  } else {
    if (goog.userAgent.GECKO) {
      style.whiteSpace = "-moz-pre-wrap";
    } else {
      style.whiteSpace = "pre-wrap";
    }
  }
};
goog.style.setInlineBlock = function(el) {
  var style = el.style;
  style.position = "relative";
  if (goog.userAgent.IE && !goog.userAgent.isVersionOrHigher("8")) {
    style.zoom = "1";
    style.display = "inline";
  } else {
    if (goog.userAgent.GECKO) {
      style.display = goog.userAgent.isVersionOrHigher("1.9a") ? "inline-block" : "-moz-inline-box";
    } else {
      style.display = "inline-block";
    }
  }
};
goog.style.isRightToLeft = function(el) {
  return "rtl" == goog.style.getStyle_(el, "direction");
};
goog.style.unselectableStyle_ = goog.userAgent.GECKO ? "MozUserSelect" : goog.userAgent.WEBKIT ? "WebkitUserSelect" : null;
goog.style.isUnselectable = function(el) {
  if (goog.style.unselectableStyle_) {
    return el.style[goog.style.unselectableStyle_].toLowerCase() == "none";
  } else {
    if (goog.userAgent.IE || goog.userAgent.OPERA) {
      return el.getAttribute("unselectable") == "on";
    }
  }
  return false;
};
goog.style.setUnselectable = function(el, unselectable, opt_noRecurse) {
  var descendants = !opt_noRecurse ? el.getElementsByTagName("*") : null;
  var name = goog.style.unselectableStyle_;
  if (name) {
    var value = unselectable ? "none" : "";
    el.style[name] = value;
    if (descendants) {
      for (var i = 0, descendant;descendant = descendants[i];i++) {
        descendant.style[name] = value;
      }
    }
  } else {
    if (goog.userAgent.IE || goog.userAgent.OPERA) {
      var value = unselectable ? "on" : "";
      el.setAttribute("unselectable", value);
      if (descendants) {
        for (var i = 0, descendant;descendant = descendants[i];i++) {
          descendant.setAttribute("unselectable", value);
        }
      }
    }
  }
};
goog.style.getBorderBoxSize = function(element) {
  return new goog.math.Size(element.offsetWidth, element.offsetHeight);
};
goog.style.setBorderBoxSize = function(element, size) {
  var doc = goog.dom.getOwnerDocument(element);
  var isCss1CompatMode = goog.dom.getDomHelper(doc).isCss1CompatMode();
  if (goog.userAgent.IE && !goog.userAgent.isVersionOrHigher("10") && (!isCss1CompatMode || !goog.userAgent.isVersionOrHigher("8"))) {
    var style = element.style;
    if (isCss1CompatMode) {
      var paddingBox = goog.style.getPaddingBox(element);
      var borderBox = goog.style.getBorderBox(element);
      style.pixelWidth = size.width - borderBox.left - paddingBox.left - paddingBox.right - borderBox.right;
      style.pixelHeight = size.height - borderBox.top - paddingBox.top - paddingBox.bottom - borderBox.bottom;
    } else {
      style.pixelWidth = size.width;
      style.pixelHeight = size.height;
    }
  } else {
    goog.style.setBoxSizingSize_(element, size, "border-box");
  }
};
goog.style.getContentBoxSize = function(element) {
  var doc = goog.dom.getOwnerDocument(element);
  var ieCurrentStyle = goog.userAgent.IE && element.currentStyle;
  if (ieCurrentStyle && goog.dom.getDomHelper(doc).isCss1CompatMode() && ieCurrentStyle.width != "auto" && ieCurrentStyle.height != "auto" && !ieCurrentStyle.boxSizing) {
    var width = goog.style.getIePixelValue_(element, ieCurrentStyle.width, "width", "pixelWidth");
    var height = goog.style.getIePixelValue_(element, ieCurrentStyle.height, "height", "pixelHeight");
    return new goog.math.Size(width, height);
  } else {
    var borderBoxSize = goog.style.getBorderBoxSize(element);
    var paddingBox = goog.style.getPaddingBox(element);
    var borderBox = goog.style.getBorderBox(element);
    return new goog.math.Size(borderBoxSize.width - borderBox.left - paddingBox.left - paddingBox.right - borderBox.right, borderBoxSize.height - borderBox.top - paddingBox.top - paddingBox.bottom - borderBox.bottom);
  }
};
goog.style.setContentBoxSize = function(element, size) {
  var doc = goog.dom.getOwnerDocument(element);
  var isCss1CompatMode = goog.dom.getDomHelper(doc).isCss1CompatMode();
  if (goog.userAgent.IE && !goog.userAgent.isVersionOrHigher("10") && (!isCss1CompatMode || !goog.userAgent.isVersionOrHigher("8"))) {
    var style = element.style;
    if (isCss1CompatMode) {
      style.pixelWidth = size.width;
      style.pixelHeight = size.height;
    } else {
      var paddingBox = goog.style.getPaddingBox(element);
      var borderBox = goog.style.getBorderBox(element);
      style.pixelWidth = size.width + borderBox.left + paddingBox.left + paddingBox.right + borderBox.right;
      style.pixelHeight = size.height + borderBox.top + paddingBox.top + paddingBox.bottom + borderBox.bottom;
    }
  } else {
    goog.style.setBoxSizingSize_(element, size, "content-box");
  }
};
goog.style.setBoxSizingSize_ = function(element, size, boxSizing) {
  var style = element.style;
  if (goog.userAgent.GECKO) {
    style.MozBoxSizing = boxSizing;
  } else {
    if (goog.userAgent.WEBKIT) {
      style.WebkitBoxSizing = boxSizing;
    } else {
      style.boxSizing = boxSizing;
    }
  }
  style.width = Math.max(size.width, 0) + "px";
  style.height = Math.max(size.height, 0) + "px";
};
goog.style.getIePixelValue_ = function(element, value, name, pixelName) {
  if (/^\d+px?$/.test(value)) {
    return parseInt(value, 10);
  } else {
    var oldStyleValue = element.style[name];
    var oldRuntimeValue = element.runtimeStyle[name];
    element.runtimeStyle[name] = element.currentStyle[name];
    element.style[name] = value;
    var pixelValue = element.style[pixelName];
    element.style[name] = oldStyleValue;
    element.runtimeStyle[name] = oldRuntimeValue;
    return pixelValue;
  }
};
goog.style.getIePixelDistance_ = function(element, propName) {
  var value = goog.style.getCascadedStyle(element, propName);
  return value ? goog.style.getIePixelValue_(element, value, "left", "pixelLeft") : 0;
};
goog.style.getBox_ = function(element, stylePrefix) {
  if (goog.userAgent.IE) {
    var left = goog.style.getIePixelDistance_(element, stylePrefix + "Left");
    var right = goog.style.getIePixelDistance_(element, stylePrefix + "Right");
    var top = goog.style.getIePixelDistance_(element, stylePrefix + "Top");
    var bottom = goog.style.getIePixelDistance_(element, stylePrefix + "Bottom");
    return new goog.math.Box(top, right, bottom, left);
  } else {
    var left = (goog.style.getComputedStyle(element, stylePrefix + "Left"));
    var right = (goog.style.getComputedStyle(element, stylePrefix + "Right"));
    var top = (goog.style.getComputedStyle(element, stylePrefix + "Top"));
    var bottom = (goog.style.getComputedStyle(element, stylePrefix + "Bottom"));
    return new goog.math.Box(parseFloat(top), parseFloat(right), parseFloat(bottom), parseFloat(left));
  }
};
goog.style.getPaddingBox = function(element) {
  return goog.style.getBox_(element, "padding");
};
goog.style.getMarginBox = function(element) {
  return goog.style.getBox_(element, "margin");
};
goog.style.ieBorderWidthKeywords_ = {"thin":2, "medium":4, "thick":6};
goog.style.getIePixelBorder_ = function(element, prop) {
  if (goog.style.getCascadedStyle(element, prop + "Style") == "none") {
    return 0;
  }
  var width = goog.style.getCascadedStyle(element, prop + "Width");
  if (width in goog.style.ieBorderWidthKeywords_) {
    return goog.style.ieBorderWidthKeywords_[width];
  }
  return goog.style.getIePixelValue_(element, width, "left", "pixelLeft");
};
goog.style.getBorderBox = function(element) {
  if (goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(9)) {
    var left = goog.style.getIePixelBorder_(element, "borderLeft");
    var right = goog.style.getIePixelBorder_(element, "borderRight");
    var top = goog.style.getIePixelBorder_(element, "borderTop");
    var bottom = goog.style.getIePixelBorder_(element, "borderBottom");
    return new goog.math.Box(top, right, bottom, left);
  } else {
    var left = (goog.style.getComputedStyle(element, "borderLeftWidth"));
    var right = (goog.style.getComputedStyle(element, "borderRightWidth"));
    var top = (goog.style.getComputedStyle(element, "borderTopWidth"));
    var bottom = (goog.style.getComputedStyle(element, "borderBottomWidth"));
    return new goog.math.Box(parseFloat(top), parseFloat(right), parseFloat(bottom), parseFloat(left));
  }
};
goog.style.getFontFamily = function(el) {
  var doc = goog.dom.getOwnerDocument(el);
  var font = "";
  if (doc.body.createTextRange && goog.dom.contains(doc, el)) {
    var range = doc.body.createTextRange();
    range.moveToElementText(el);
    try {
      font = range.queryCommandValue("FontName");
    } catch (e) {
      font = "";
    }
  }
  if (!font) {
    font = goog.style.getStyle_(el, "fontFamily");
  }
  var fontsArray = font.split(",");
  if (fontsArray.length > 1) {
    font = fontsArray[0];
  }
  return goog.string.stripQuotes(font, "\"'");
};
goog.style.lengthUnitRegex_ = /[^\d]+$/;
goog.style.getLengthUnits = function(value) {
  var units = value.match(goog.style.lengthUnitRegex_);
  return units && units[0] || null;
};
goog.style.ABSOLUTE_CSS_LENGTH_UNITS_ = {"cm":1, "in":1, "mm":1, "pc":1, "pt":1};
goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_ = {"em":1, "ex":1};
goog.style.getFontSize = function(el) {
  var fontSize = goog.style.getStyle_(el, "fontSize");
  var sizeUnits = goog.style.getLengthUnits(fontSize);
  if (fontSize && "px" == sizeUnits) {
    return parseInt(fontSize, 10);
  }
  if (goog.userAgent.IE) {
    if (sizeUnits in goog.style.ABSOLUTE_CSS_LENGTH_UNITS_) {
      return goog.style.getIePixelValue_(el, fontSize, "left", "pixelLeft");
    } else {
      if (el.parentNode && el.parentNode.nodeType == goog.dom.NodeType.ELEMENT && sizeUnits in goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_) {
        var parentElement = (el.parentNode);
        var parentSize = goog.style.getStyle_(parentElement, "fontSize");
        return goog.style.getIePixelValue_(parentElement, fontSize == parentSize ? "1em" : fontSize, "left", "pixelLeft");
      }
    }
  }
  var sizeElement = goog.dom.createDom("span", {"style":"visibility:hidden;position:absolute;" + "line-height:0;padding:0;margin:0;border:0;height:1em;"});
  goog.dom.appendChild(el, sizeElement);
  fontSize = sizeElement.offsetHeight;
  goog.dom.removeNode(sizeElement);
  return fontSize;
};
goog.style.parseStyleAttribute = function(value) {
  var result = {};
  goog.array.forEach(value.split(/\s*;\s*/), function(pair) {
    var keyValue = pair.split(/\s*:\s*/);
    if (keyValue.length == 2) {
      result[goog.string.toCamelCase(keyValue[0].toLowerCase())] = keyValue[1];
    }
  });
  return result;
};
goog.style.toStyleAttribute = function(obj) {
  var buffer = [];
  goog.object.forEach(obj, function(value, key) {
    buffer.push(goog.string.toSelectorCase(key), ":", value, ";");
  });
  return buffer.join("");
};
goog.style.setFloat = function(el, value) {
  el.style[goog.userAgent.IE ? "styleFloat" : "cssFloat"] = value;
};
goog.style.getFloat = function(el) {
  return el.style[goog.userAgent.IE ? "styleFloat" : "cssFloat"] || "";
};
goog.style.getScrollbarWidth = function(opt_className) {
  var outerDiv = goog.dom.createElement("div");
  if (opt_className) {
    outerDiv.className = opt_className;
  }
  outerDiv.style.cssText = "overflow:auto;" + "position:absolute;top:0;width:100px;height:100px";
  var innerDiv = goog.dom.createElement("div");
  goog.style.setSize(innerDiv, "200px", "200px");
  outerDiv.appendChild(innerDiv);
  goog.dom.appendChild(goog.dom.getDocument().body, outerDiv);
  var width = outerDiv.offsetWidth - outerDiv.clientWidth;
  goog.dom.removeNode(outerDiv);
  return width;
};
goog.style.MATRIX_TRANSLATION_REGEX_ = new RegExp("matrix\\([0-9\\.\\-]+, [0-9\\.\\-]+, " + "[0-9\\.\\-]+, [0-9\\.\\-]+, " + "([0-9\\.\\-]+)p?x?, ([0-9\\.\\-]+)p?x?\\)");
goog.style.getCssTranslation = function(element) {
  var transform = goog.style.getComputedTransform(element);
  if (!transform) {
    return new goog.math.Coordinate(0, 0);
  }
  var matches = transform.match(goog.style.MATRIX_TRANSLATION_REGEX_);
  if (!matches) {
    return new goog.math.Coordinate(0, 0);
  }
  return new goog.math.Coordinate(parseFloat(matches[1]), parseFloat(matches[2]));
};
goog.require("goog.dom");
goog.require("goog.dom.classes");
goog.require("goog.style");
function Storage() {
  this.cache_ = {};
}
Storage.prototype.load = function(callback) {
  var blob = decodeURIComponent(window.location.hash.slice(window.location.hash.indexOf("=") + 1));
  if (blob) {
    this.cache_ = JSON.parse(blob);
  }
  callback();
};
Storage.prototype.get = function(path, callback) {
  if (this.cache_[path]) {
    callback(200, this.cache_[path]);
    return;
  }
  callback(404);
};
Storage.prototype.commit_ = function() {
  window.location.hash = "highlights=" + encodeURIComponent(JSON.stringify(this.cache_));
};
Storage.prototype.post = function(path, payload, opt_callback) {
  this.cache_[path] = payload;
  this.commit_();
  var callback = opt_callback || function() {
  };
  callback(200, payload);
};
var storage = new Storage;
var highlighter;
window.onload = function() {
  rangy.init();
  highlighter = rangy.createHighlighter();
  highlighter.threads = highlighter.threads || {};
  highlighter.addClassApplier(rangy.createCssClassApplier("highlight", {ignoreWhiteSpace:true, tagNames:["span", "a"], elementAttributes:{foo:"bar"}, onElementCreate:function(el) {
    setTimeout(function() {
      var highlight = highlighter.getHighlightForElement(el);
      var thread = document.body.querySelector(".thread[data-thread-id = '" + highlight.id + "']");
      if (thread) {
        return;
      }
      storage.get("/threads/" + highlight.id, function(s, thread) {
        var className = "";
        var id = highlight.id;
        if (s == 404) {
          thread = {date:(new Date).toString(), author:{username:"Sam Goto"}};
          className += "thread-new";
        }
        var offsetTop = goog.style.getPageOffsetTop(el);
        var html = createThread(id, thread);
        var container = goog.dom.createElement("div");
        container.className = "thread";
        container.innerHTML = html;
        container.setAttribute("data-thread-id", id);
        container.className = container.className + " " + className;
        document.body.querySelector(".kiwi").appendChild(container);
      });
    }, 0);
  }, elementProperties:{href:"#", onclick:function(e) {
    var highlight = highlighter.getHighlightForElement(this);
    var thread = document.body.querySelector(".thread[data-thread-id = '" + highlight.id + "']");
    var offsetTop = goog.style.getPageOffsetTop(this);
    var threadTop = goog.style.getClientPosition(thread).y;
    var pane = document.body.querySelector(".kiwi");
    var marginTop = Number(pane.style.marginTop.replace(/[^-\d\.]/g, "") || 0);
    marginTop = marginTop + offsetTop - threadTop;
    pane.style.marginTop = marginTop + "px";
    return false;
  }}}));
  var container = goog.dom.createElement("div");
  container.className = "kiwi";
  document.body.appendChild(container);
  storage.load(function(serialized) {
    storage.get("/highlights", function(status, highlights) {
      if (status == 200) {
        highlighter.deserialize(highlights);
      }
    });
  });
};
function onCreateThread(input) {
  var caption = input["caption"].value;
  var p = walkUp(input, "thread");
  var id = p.getAttribute("data-thread-id");
  var thread = {caption:caption, date:(new Date).toString(), author:{username:"Sam Goto"}};
  storeThread(id, thread, function() {
    goog.dom.classes.remove(p, "thread-new");
    var el = p.querySelector(".caption .content");
    el.innerHTML = caption;
  });
  return false;
}
function storeThread(id, thread, callback) {
  storage.post("/threads/" + id, thread, function() {
    var highlights = highlighter.serialize();
    storage.post("/highlights", highlights, function() {
      callback();
    });
  });
}
function walkUp(el, clazz) {
  var p = el.parentNode;
  while (p !== null) {
    if (goog.dom.classes.has(p, clazz)) {
      return p;
    }
    p = p.parentNode;
  }
}
function onCancelThread(input) {
  var p = walkUp(input, "thread");
  var id = p.getAttribute("data-thread-id");
  for (var h in highlighter.highlights) {
    if (highlighter.highlights[h].id == id) {
      highlighter.removeHighlights([highlighter.highlights[h]]);
    }
  }
  goog.dom.removeNode(p);
  return false;
}
function onCreateComment(input) {
  var caption = input["comment"].value;
  var p = walkUp(input, "thread");
  var id = p.getAttribute("data-thread-id");
  storage.get("/threads/" + id, function(status, payload) {
    payload.comments = payload.comments || [];
    var comment = {date:(new Date).toString(), caption:caption, author:{username:"Sam Goto"}};
    payload.comments.push(comment);
    storage.post("/threads/" + id, payload, function(payload) {
      var container = p.querySelector(".comments");
      var el = goog.dom.createElement("div");
      el.className = "comment";
      el.innerHTML = createComment(comment);
      container.appendChild(el);
      input["comment"].value = "";
    });
  });
  return false;
}
function onCancelComment(input) {
  input.form["comment"].value = "";
  return false;
}
function createComment(comment) {
  var html = "";
  html += "<div class='header'>";
  html += "  <span class='username'>";
  html += comment.author.username;
  html += " </span>";
  html += "  <span class='date'>";
  html += comment.date;
  html += "  </span>";
  html += "</div>";
  html += "<div class='content'>";
  html += comment.caption;
  html += "</div>";
  return html;
}
function createThread(id, thread) {
  var html = "";
  html += "  <div class='caption'>";
  html += "    <div class='header'>";
  html += "      <span class='username'>";
  html += thread.author.username;
  html += "      </span>";
  html += "      <span class='date'>";
  html += thread.date;
  html += "      </span>";
  html += "    </div>";
  html += "    <div class='content'>";
  if (thread.caption) {
    html += thread.caption;
  }
  html += "    </div>";
  html += "  </div>";
  html += "  <div class='comments'>";
  for (var c in thread.comments) {
    var comment = thread.comments[c];
    html += "<div class='comment'>";
    html += createComment(comment);
    html += "</div>";
  }
  html += "  </div>";
  html += "  <div class='create-form'>";
  html += "    <form name='create-form' onsubmit='return onCreateThread(this);'>";
  html += "      <textarea required name='caption' autofocus placeholder='Add a comment'>";
  html += "</textarea>";
  html += "      <input type='submit' value='create'>";
  html += "      <input type='submit' value='cancel' onclick='return onCancelThread(this);'>";
  html += "    </form>";
  html += "  </div>";
  html += "  <div class='comment-form'>";
  html += "    <form name='comment-form' onsubmit='return onCreateComment(this);'>";
  html += "      <textarea required name='comment' placeholder='Reply'>";
  html += "</textarea>";
  html += "      <input type='submit' value='create'>";
  html += "      <input type='submit' value='cancel' onclick='return onCancelComment(this);'>";
  html += "    </form>";
  html += "  </div>";
  return html;
}
window.onmouseup = function(e) {
  if (window.getSelection().type == "Caret") {
    return;
  }
  highlighter.highlightSelection("highlight", {exclusive:false});
};

