;(function (w, d) {
  'use strict';

  var Select4 = function Select4(select, opts) {
    if (select === undefined || select === null) {
      return null;
    }
    if (select.jquery) {
      select = select[0];
    }

    if (opts) {
      this.placeholder = opts.placeholder || '';
      this.changeCallback = opts.onChange;
    }

    this.isOpen = false;
    this.activeOptions = 0;
    this.focus = 0;
    this.arrowCooldownTimer = null;
    this.arrowCooldown = false;
    this.searchTimer = null;
    this.searchQuery = '';
    this.select = select;
    this.select.addEventListener('change', this.onChange.bind(this), false);
    this.select.style.display = 'none';

    // Add empty first option that is disabled if select has no options
    if (this.select.options.length == 0) {
      var empty = new Option('', '', true, true);
      empty.disabled = true;
      this.select.add(empty);
    }

    this.rootEl = d.createElement('span');
    this.rootEl.className = 'select4';
    this.rootEl.setAttribute('tabindex', '0');

    this.rootEl.addEventListener('focus', this.onFocus.bind(this), false);
    this.rootEl.addEventListener('blur', this.onBlur.bind(this),  false);
    this.rootEl.addEventListener('click', this.onClick.bind(this), false);
    this.rootEl.addEventListener('mouseover', this.onMouseOver.bind(this), false);

    this.displaySpan = d.createElement('span');
    if (this.select.selectedIndex >= 0) {
      this.displaySpan.innerHTML = this.select.options[this.select.selectedIndex].text;
    }
    this.rootEl.appendChild(this.displaySpan);

    // Keeping track of the keyevent function
    this.keyEventFunc = this.onKeyEvent.bind(this);
    
    var parentNode = this.select.parentNode;
    parentNode.insertBefore(this.rootEl, this.select);
    
    var _this = this;
    var clickFunction = function (idx) {
      return function () { _this.selectAtIndex.call(_this, idx); }
    };

    this.optionsUl = d.createElement('ul');
    for (var i=0, len=this.select.options.length; i<len; i++) {
      
      var option = this.select.options[i];
      if (option.disabled) {
        continue;
      }
      this.activeOptions++;
      var optionLi = d.createElement('li');
      optionLi.innerHTML = option.text;
      optionLi['data-index'] = i;
      if (this.select.selectedIndex == i) {
        optionLi.className = 'selected';
      }
      optionLi.addEventListener('click', clickFunction.call(this, i), false);
      this.optionsUl.appendChild(optionLi)
    }

    if (this.select.selectedIndex <= 0) {
      this.displaySpan.className = 'placeholder';
      this.displaySpan.innerHTML = this.placeholder;
    }

    this.rootEl.appendChild(this.optionsUl);
  };

  Select4.prototype.length = function length() {
    return this.activeOptions;
  };

  Select4.prototype.add = function add(text, value) {
    var option = new Option(text, value);
    this.addOption.call(this, option);
  };

  Select4.prototype.addOption = function addOption(option) {
    var _this = this;
    var selectionChanged = option.selected;
    this.select.add(option);
    var optionLi = d.createElement('li');
    optionLi.innerHTML = option.text;

    var clickFunction = function (idx) {
      return function () { _this.selectAtIndex.call(_this, idx); }
    };

    this.activeOptions++;
    var optionLi = d.createElement('li');
    var i = this.select.options.length-1;
    optionLi.innerHTML = option.text;
    optionLi['data-index'] = i;
    optionLi.addEventListener('click', clickFunction.call(this, i), false);
    this.optionsUl.appendChild(optionLi)

    if (selectionChanged) {
      this.displaySpan.className = '';
      this.displaySpan.innerHTML = this.select.options[this.select.selectedIndex].text;
      var idx = this.select.selectedIndex;
      for (var i=0, len=this.optionsUl.childNodes.length; i<len; i++) {
        var optionLi = this.optionsUl.childNodes[i];
        optionLi.className = '';
      }
      this.optionsUl.childNodes[idx].className = 'selected';
    }
  };

  Select4.prototype.deselect = function deselect() {
    this.select.selectedIndex = 0;
    this.displaySpan.className = 'placeholder';
    this.displaySpan.innerHTML = this.placeholder;
    
  };

  // Removes an option from the select. Does never remove the first (disabled) option
  Select4.prototype.remove = function remove(idx) {
    if (idx > 0) {
      this.select.remove(idx);
      Utils.dom.remove(this.optionsUl.childNodes[idx-1]);
      this.activeOptions--;
    }
  };

  // Removes all options (except for the first empty option)
  Select4.prototype.removeAll = function removeAll() {
    while (this.optionsUl.firstChild) {
      this.optionsUl.removeChild(this.optionsUl.firstChild);
    }
    while (this.select.options.length > 1) {
      this.select.remove(this.select.options[this.select.options.length-1]);
    }
    this.deselect.call(this);
  };

  Select4.prototype.onKeyEvent = function onKeyEvent(e) {
    switch (e.which) {
    case 13: // ENTER
      e.preventDefault();
      this.selectAtFocus();
      this.close.call(this);
      break;
    case 27: // ESC
      e.preventDefault();
      this.close.call(this);
      break;
    case 38: // UP
      e.preventDefault();
      if (this.isOpen === false) {
        this.open.call(this);
      }
      this.startArrowCooldown.call(this);
      var curr = this.optionsUl.querySelector('.focus');
      if (curr !== null) {
        var prev = curr.previousElementSibling;
        if (prev !== null) {
          this.focusOnElement.call(this, prev);
        }
      } else {
        this.focusOnElement.call(this, this.optionsUl.lastChild);
      }
      break;
    case 39: // RIGHT
      e.preventDefault();
      break;
    case 40: // DOWN
      e.preventDefault();
      if (this.isOpen === false) {
        this.open.call(this);
      }
      this.startArrowCooldown.call(this);
      var curr = this.optionsUl.querySelector('.focus');
      if (curr !== null) {
        var next = curr.nextElementSibling;
        if (next !== null) {
          this.focusOnElement.call(this, next);
        }
      } else {
        this.focusOnElement.call(this, this.optionsUl.firstChild);
      }
      break;
    case 37: // LEFT
      e.preventDefault();
      break;
    case 32: // SPACE
      e.preventDefault();
      if (this.searchQuery.length > 0) {
        this.search.call(this, ' ');
      }
      break;
    default: // OTHER KEYS
      var keyChar = String.fromCharCode(e.keyCode);
      var strippedChar = keyChar.replace(/^\s+|\s+$/g, '');
      if (strippedChar.length > 0) {
        this.search.call(this, strippedChar);
      }
    };
  };

  Select4.prototype.startArrowCooldown = function startArrowCooldown() {
    if (this.arrowCooldownTimer) {
      clearTimeout(this.arrowCooldownTimer);
    }
    this.arrowCooldownTimer = setTimeout(this.endArrowCooldown.bind(this), 200);
    this.arrowCooldown = true;
  };

  Select4.prototype.endArrowCooldown = function startArrowCooldown() {
    this.arrowCooldown = false;
  };

  Select4.prototype.open = function open() {
    this.rootEl.classList.add('open');
    this.optionsUl.style.display = 'block';
    this.isOpen = true;
    if (this.select.selectedIndex > 0) {
      this.focusOnIndex.call(this, this.select.selectedIndex);
    }
    var menuHeight = this.optionsUl.clientHeight;
    var bRect = this.rootEl.getBoundingClientRect()
    var overflowHeight = menuHeight + bRect.top - w.innerHeight;
    if (overflowHeight > -30) {
      this.optionsUl.style.marginTop = -(overflowHeight + 50) + 'px';
    }
  };

  Select4.prototype.close = function close() {
    this.rootEl.classList.remove('open');
    this.optionsUl.style.display = 'none';
    this.isOpen = false;
  };

  Select4.prototype.scrollToElem = function scrollToElem(elem) {
    var elemTop = elem.offsetTop;
    var elemHeight = elem.offsetHeight;
    var ulHeight = this.optionsUl.offsetHeight;
    var scrollTop = this.optionsUl.scrollTop;
    if (elemTop+elemHeight <= scrollTop) {
      this.optionsUl.scrollTop = elemTop;
    } else if (elemTop + elemHeight >= scrollTop + ulHeight) {
      this.optionsUl.scrollTop = elemTop - ulHeight + elemHeight;
    }
  };

  Select4.prototype.focusOnIndex = function focusOnIndex(idx) {
    idx = idx || this.select.selectedIndex;
    for (var i=0, len=this.optionsUl.childNodes.length; i<len; i++) {
      var optionLi = this.optionsUl.childNodes[i];
      if (optionLi['data-index'] == idx) {
        optionLi.classList.add('focus');
        this.scrollToElem.call(this, optionLi);
      } else {
        optionLi.classList.remove('focus');
      }
    }
  };

  // Focuses on the element elem (like hover)
  Select4.prototype.focusOnElement = function focusOnElement(elem) {
    for (var i=0, len=this.optionsUl.childNodes.length; i<len; i++) {
      var optionLi = this.optionsUl.childNodes[i];
      optionLi.classList.remove('focus');
    }
    elem.classList.add('focus');
    this.scrollToElem.call(this, elem);
  };

  // Returns the currently focused element
  Select4.prototype.elemAtFocus = function elemAtFocus() {
    for (var i=0; i<this.optionsUl.childNodes.length; i++) {
      var elem = this.optionsUl.childNodes[i];
      if (elem.classList.contains('focus')) {
        return elem;
      }
    }
    return null;
  };

  // Selects the element currently in focus
  Select4.prototype.selectAtFocus = function selectAtFocus() {
    var focus = this.optionsUl.querySelector('.focus');
    if (focus !== null) {
      this.selectAtIndex.call(this, parseInt(focus['data-index']));
    }
  };

  // Returns the element that corresponds to index idx
  Select4.prototype.elemAtIndex = function elemAtIndex(idx) {
    for (var i=0; i<this.optionsUl.childNodes.length; i++) {
      var elem = this.optionsUl.childNodes[i];
      if (parseInt(elem['data-index']) === idx) {
        return elem;
      }
    }
    return null;
  };

  Select4.prototype.search = function search(newChar) {
    this.startArrowCooldown.call(this);
    
    // Search beginning or words in each item
    this.searchQuery += newChar;

    //var re = new RegExp('\\b' + this.searchQuery, 'gi');
    var re = new RegExp('^' + this.searchQuery, 'gi');
    var found = false;
    for (var i=0; i<this.select.options.length; i++) {
      var option = this.select.options[i];
      if (re.exec(option.text)) {
        this.focusOnIndex.call(this, option.index);
        found = true;
        break;
      }
    }
    if (found === false) {
      // remove failed search
      this.searchQuery = '';
    }

    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(this.searchTimeout.bind(this), 500);
  };

  Select4.prototype.searchTimeout = function searchTimeout() {
    this.searchQuery = '';
  };

  Select4.prototype.onFocus = function onFocus() {
    this.open.call(this);
    this.rootEl.addEventListener('keydown', this.keyEventFunc, false);
  };

  Select4.prototype.onBlur = function onBlur() {
    if (this.isOpen) {
      this.close.call(this);
    }
    this.rootEl.removeEventListener('keydown', this.keyEventFunc, false);
  };

  Select4.prototype.onClick = function onClick() {
    if (this.isOpen) {
      this.close.call(this);
    } else {
      this.open.call(this);
    }
  };

  Select4.prototype.onMouseOver = function onMouseOver(e) {
    if (this.arrowCooldown) {
      return;
    }
    var idx = e.target['data-index'];
    if (idx) {
      this.focusOnIndex.call(this, idx)
    }
  };

  Select4.prototype.onChange = function onChange() {
    var idx = this.select.selectedIndex;
    for (var i=0, len=this.optionsUl.childNodes.length; i<len; i++) {
      var optionLi = this.optionsUl.childNodes[i];
      if (optionLi['data-index'] == idx) {
        optionLi.classList.add('selected');
      } else {
        optionLi.classList.remove('selected');
      }
    }
    this.displaySpan.className = '';
    this.displaySpan.innerHTML = this.select.options[idx].text;
    if (this.changeCallback) {
      this.changeCallback.call(this, this.select.options[idx]);
    }
  };

  Select4.prototype.selectAtIndex = function selectAtIndex(idx) {
    this.select.selectedIndex = idx;
    this.onChange.call(this);
  };
  
  this.Select4 = Select4;
}).call(this, window, document);

