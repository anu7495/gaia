/* globals KeyEvent */

'use strict';

(function(exports){
  /**
   * Root folder name.
   * @type {Number}
   */
  const ROOT_FOLDER = '/';

  /**
   * Max number of list item visible when scroll.
   * @type {Number}
   */
  const MAX_VISIBLE_ITEM = 7;

  /**
   * Max number of list html element can be render.
   * @type {Number}
   */
  const MAX_LIST_ELEMENT = 21;

  /**
   * Height of list item element, unit is rem.
   * @type {Number}
   */
  const LIST_ITEM_HEIGHT = 12;

  /**
   * BookmarkList constructor
   * @constructor
   * @param {Node} el - Target HTML element of BookmarkList.
   */
  function BookmarkList(el){
    this.el = el;

    this.listEl = this.el.querySelector('.bookmark-list');
    /**
     * Number of list item rendered.
     * @type {Number}
     */
    this.listItemRenderNum = 0;

    /**
     * Index of focus element in list.
     * @type {Number}
     */
    this.focusIndex = 0;

    /**
     * Index of list item start at.
     * @type {Number}
     */
    this.listIndexStartAt = 0;

    /**
     * Index of list item end at.
     * @type {Number}
     */
    this.listIndexEndAt = 0;

    /**
     * Index of visible list item start at.
     * @type {Number}
     */
    this.listVisibleStartAt = 0;

    /**
     * Current navigation folder.
     * @type {String}
     */
    this.navState = '';

    /**
     * Save user browser history.
     * @type {Array}
     */
    this.navHistory = [];

    /**
     * list items which in dom tree and been initialized but render with data
     * @type {Array}
     */
    this.initializedItems = [];

    /**
     * List item element map
     * @type {Object}
     */
    this.listItemMap = {};
  }

  BookmarkList.prototype = {
    constructor: BookmarkList,

    /**
     * Open bookmark list.
     * @param  {Array} bookmarks - Array of bookmark data.
     */
    open: function() {
      var eventDetail = {
        startAt: 0,
        number: MAX_VISIBLE_ITEM*2,
        folderId: ROOT_FOLDER,
        callback: (function(bookmarks) {
          var event = new Event('open'),
              focusEl = null;
          this.navHistory.push(ROOT_FOLDER);
          this.render(bookmarks);
          this.el.classList.add('show');
          focusEl = this.listItemMap[0];
          if(focusEl) {
            this.focusItem(focusEl);
          }
          this.el.dispatchEvent(event);
        }).bind(this)
      };
      var event = new CustomEvent('loadDataByRange', {detail: eventDetail});

      this.reset();
      this.el.dispatchEvent(event);
    },

    /**
     * Close bookmark list.
     */
    close: function() {
      var event = new Event('close');
      this.navHistory = [];
      this.el.classList.remove('show');
      this.el.dispatchEvent(event);
    },

    /**
     * Reset bookmark list
     */
    reset: function(){
      var key = 0;

      this.listEl.style.transform = 'translateY(0rem)';

      this.focusIndex = 0;
      this.listVisibleStartAt = 0;
      this.listIndexStartAt = 0;
      this.listIndexEndAt = 0;
      this.navState = '';

      for(key in this.listItemMap) {
        if(this.listItemMap.hasOwnProperty(key)) {
          this.resetItem(this.listItemMap[key]);
          this.initializedItems.push(this.listItemMap[key]);
          delete this.listItemMap[key];
        }
      }
    },

    /**
     * Render bookmark list
     * @param  {Array} bookmarks - Array of bookmark data.
     */
    render: function(bookmarks){
      var itemEl = null,
          i = 0,
          length = bookmarks.length;

      this.navState = this.getCurNavHistory();
      /*
       *  if current render folder is not ROOT_FOLDER,
       *  render back button element first
       */
      if(this.navState !== ROOT_FOLDER) {
        bookmarks.unshift(this.generateBackButtonData());
      }

      for(; i < length; i++) {
        /*
         *  if there are reseted list item, use these to render data,
         *  else create new html element to render data
         */
        if(this.initializedItems.length > 0) {
          itemEl = this.initializedItems.pop();
          this.updateItem(itemEl, bookmarks[i]);
        } else {
          itemEl = this.createItem(bookmarks[i]);
          this.listEl.appendChild(itemEl);
          this.listItemRenderNum++;
        }

        itemEl.setAttribute('data-index', i);
        itemEl.style.transform =
          'translateY(' + (LIST_ITEM_HEIGHT * i) + 'rem)';
        this.listItemMap[i] = itemEl;
      }
      this.listIndexEndAt = length - 1;
    },

    /**
     * Is bookmark list opened.
     * @return {Boolean} - true when boolmark list opened.
     */
    isDisplay: function() {
      return this.el.classList.contains('show');
    },

    /**
     * Add new list item.
     * @param {Number} index - Index of new list item.
     * @param {Object} data  - The bookmark data.
     */
    addItem: function(index, data) {
      if(!data) {
        return;
      }
      var itemEl = null,
          transform = 0;
      if(index < this.listIndexStartAt) {
        // add item to the beginning of the list
        if(this.initializedItems.length > 0) {
          itemEl = this.initializedItems.pop();
          this.updateItem(itemEl, data);
        } else if (this.listItemRenderNum === MAX_LIST_ELEMENT){
          itemEl = this.listItemMap[this.listIndexEndAt];
          this.updateItem(itemEl, data);
          delete this.listItemMap[this.listIndexEndAt];
          this.listIndexEndAt--;
        } else {
          itemEl = this.createItem(data);
          this.listEl.appendChild(itemEl);
          this.listItemRenderNum++;
        }
        this.listItemMap[index] = itemEl;
        itemEl.setAttribute('data-index', index);
        transform = (index) * LIST_ITEM_HEIGHT;
        itemEl.style.transform =
          'translateY(' +   transform + 'rem)';
        this.listIndexStartAt = index;
      } else if(index > this.listIndexEndAt) {
        // add item to the end of the list
        if(this.initializedItems.length > 0) {
          itemEl = this.initializedItems.pop();
          this.updateItem(itemEl, data);
        } else if (this.listItemRenderNum === MAX_LIST_ELEMENT){
          itemEl = this.listItemMap[this.listIndexStartAt];
          this.updateItem(itemEl, data);
          delete this.listItemMap[this.listIndexStartAt];
          this.listIndexStartAt++;
        } else {
          itemEl = this.createItem(data);
          this.listEl.appendChild(itemEl);
          this.listItemRenderNum++;
        }
        this.listItemMap[index] = itemEl;
        itemEl.setAttribute('data-index', index);
        transform = (index) * LIST_ITEM_HEIGHT;
        itemEl.style.transform =
          'translateY(' +   transform + 'rem)';
        this.listIndexEndAt = index;
      }
    },

    /**
     * Create List Item.
     * @param  {Object} data - bookmark data object
     */

    /**
     *  <li class="list-item">
     *    <div class="icon-box icon-box-left">
     *      <div class="icon"></div>
     *    </div>
     *    <div class="text-box">
     *      <span class="title"></span>
     *      <span class="uri"></span>
     *    </div>
     *    <div class="icon-box icon-box-right">
     *      <div class="icon" data-icon="arrow-right"></div>
     *    </div>
     *  </li>
     */
    createItem : function(data) {
      var itemEl = document.createElement('li'),
          iconLeftEl = document.createElement('div'),
          iconImgLeftEl = document.createElement('div'),
          textEl = document.createElement('div'),
          titleEl = document.createElement('span'),
          urlEl = document.createElement('span'),
          iconRightEl = document.createElement('div'),
          iconImgRightEl = document.createElement('div');

      itemEl.classList.add('list-item');
      itemEl.setAttribute('tabindex', '0');
      itemEl.setAttribute('data-type', data.type);
      if(data.readOnly) {
        itemEl.setAttribute('readOnly', data.readOnly);
      } else {
        itemEl.setAttribute('readOnly', false);
      }

      iconLeftEl.classList.add('icon-box', 'icon-box-left');
      iconImgLeftEl.classList.add('icon');
      iconLeftEl.appendChild(iconImgLeftEl);

      textEl.classList.add('text-box');
      titleEl.classList.add('title');
      titleEl.textContent = data.title;
      urlEl.classList.add('uri');
      textEl.appendChild(titleEl);
      textEl.appendChild(urlEl);

      iconRightEl.classList.add('icon-box', 'icon-box-right');
      iconImgRightEl.classList.add('icon');
      iconRightEl.appendChild(iconImgRightEl);

      if(data.type) {
        itemEl.setAttribute('data-type', data.type);
        switch (data.type) {
          case 'folder':
            itemEl.setAttribute('data-folder', data.id);
            iconImgLeftEl.setAttribute('data-icon', 'folder');
            iconImgRightEl.setAttribute('data-icon', 'arrow-right');
            break;
          case 'bookmark':
            itemEl.setAttribute('data-folder', '');
            if(data.iconUri) {
              iconImgLeftEl.setAttribute('data-icon', '');
              iconImgLeftEl.style.backgroundImage = 'url(' + data.iconUri +')';
            } else {
              iconImgLeftEl.setAttribute('data-icon', 'default-fav');
            }
            urlEl.textContent = data.uri;
            iconImgRightEl.setAttribute('data-icon', '');
            break;
          case 'button':
            itemEl.setAttribute('data-folder', '');
            iconImgLeftEl.setAttribute('data-icon', 'folder');
            iconImgRightEl.setAttribute('data-icon', 'arrow-left');
            break;
          default:
            break;
        }
      } else {
        itemEl.setAttribute('data-type', 'bookmark');
        itemEl.setAttribute('data-folder', '');
        if(data.iconUri) {
          iconImgLeftEl.setAttribute('data-icon', '');
          iconImgLeftEl.style.backgroundImage = 'url(' + data.iconUri +')';
        } else {
          iconImgLeftEl.setAttribute('data-icon', 'default-fav');
        }
        urlEl.textContent = data.uri;
        iconImgRightEl.setAttribute('data-icon', '');
      }


      itemEl.appendChild(iconLeftEl);
      itemEl.appendChild(textEl);
      itemEl.appendChild(iconRightEl);

      // XXX: delegate these events later
      itemEl.
        addEventListener('keydown', this.handleItemKeyDown.bind(this));
      itemEl.
        addEventListener('keyup', this.handleItemKeyUp.bind(this));
      itemEl.
        addEventListener('mouseup', this.handleItemMouseUp.bind(this));
      itemEl.
        addEventListener('mouseover', this.handleItemMouseOver.bind(this));
      itemEl.
        addEventListener('mouseout', this.handleItemMouseOut.bind(this));

      return itemEl;
    },

    /**
     * Update list item element content.
     * @param  {Node} el - HTML list item to update.
     * @param  {Object} data - Bookmark data object.
     */
    updateItem : function(el, data) {
      var iconImgLeftEl = el.querySelector('.icon-box-left .icon'),
          titleEl = el.querySelector('.title'),
          uriEl = el.querySelector('.uri'),
          iconImgRightEl = el.querySelector('.icon-box-right .icon');

      if(data.readOnly) {
        el.setAttribute('readOnly', data.readOnly);
      } else {
        el.setAttribute('readOnly', false);
      }

      if(data.type) {
        el.setAttribute('data-type', data.type);
        switch (data.type) {
          case 'folder':
            el.setAttribute('data-folder', data.id);
            iconImgLeftEl.style.backgroundImage = '';
            iconImgLeftEl.setAttribute('data-icon', 'folder');
            titleEl.textContent = data.title;
            uriEl.textContent = '';
            iconImgRightEl.setAttribute('data-icon', 'arrow-right');
            break;
          case 'bookmark':
            el.setAttribute('data-folder', '');
            if(data.iconUri) {
              iconImgLeftEl.style.backgroundImage = 'url(' + data.iconUri +')';
              iconImgLeftEl.setAttribute('data-icon', '');
            } else {
              iconImgLeftEl.style.backgroundImage = '';
              iconImgLeftEl.setAttribute('data-icon', 'default-fav');
            }
            titleEl.textContent = data.title;
            uriEl.textContent = data.uri;
            iconImgRightEl.setAttribute('data-icon', '');
            break;
          case 'button':
            el.setAttribute('data-folder', '');
            iconImgLeftEl.style.backgroundImage = '';
            iconImgLeftEl.setAttribute('data-icon', 'folder');
            titleEl.textContent = data.title;
            uriEl.textContent = '';
            iconImgRightEl.setAttribute('data-icon', 'arrow-left');
            break;
          default:
            break;
        }
      } else {
        el.setAttribute('data-type', 'bookmark');
        el.setAttribute('data-folder', '');
        if(data.iconUri) {
          iconImgLeftEl.style.backgroundImage = 'url(' + data.iconUri +')';
          iconImgLeftEl.setAttribute('data-icon', '');
        } else {
          iconImgLeftEl.style.backgroundImage = '';
          iconImgLeftEl.setAttribute('data-icon', 'default-fav');
        }
        titleEl.textContent = data.title;
        uriEl.textContent = data.uri;
        iconImgRightEl.setAttribute('data-icon', '');
      }
    },

    /**
     * Remove the focus list item.
     */
    removeFocusItem: function() {
      var targetEl = null,
          i = 0;

      targetEl = this.listItemMap[this.focusIndex];
      if(targetEl) {
        this.resetItem(targetEl);
        this.initializedItems.push(targetEl);

        //reindex and update transform of the element behind the focus index
        for(i = this.focusIndex; i < this.listIndexEndAt; i++) {
          this.listItemMap[i] = this.listItemMap[i+1];
          targetEl = this.listItemMap[i];
          targetEl.setAttribute('data-index', i);
          this.shiftItemTransform(targetEl, (-1 * LIST_ITEM_HEIGHT));
        }

        delete this.listItemMap[this.listIndexEndAt];
        this.listIndexEndAt--;

        // if the removed item is the last item of index,
        // focus the new last element
        if(this.listItemMap[this.focusIndex]) {
          this.focusItem(this.listItemMap[this.focusIndex]);
        } else if(this.listIndexEndAt !== -1) {
          this.focusIndex = this.listIndexEndAt;
          this.focusItem(this.listItemMap[this.focusIndex]);
        }

        var event = new Event('itemRemoved');
        this.el.dispatchEvent(event);
      }
    },

    /**
     * Focus list item.
     * @param  {Node} el - HTML list item to focus.
     */
    focusItem: function(el) {
      el.focus();
      var event = new CustomEvent('focusItem', {detail: el});
      this.el.dispatchEvent(event);
    },

    /**
     * Focus the First visible list item.
     */
    focusFirstVisibleItem: function() {
      var targetEl = null;

      // if there is list item rendered and the current active element not in
      // bookmark list, focus the first visible list item.
      if(this.listIndexEndAt !== -1 &&
        Array.prototype.indexOf.call(
          this.listEl.children,
          document.activeElement) === -1) {
        this.focusIndex = this.listVisibleStartAt;
        targetEl = this.listItemMap[this.focusIndex];
        if(targetEl) {
          this.focusItem(targetEl);
        }
      }
    },

    /**
     * Reset list item.
     * @param  {Node} el - HTML list item to focus.
     */
    resetItem: function(el) {
      var iconImgEl = el.querySelector('.icon-box-left .icon'),
          titleEl = el.querySelector('.title'),
          uriEl = el.querySelector('.uri');

      el.setAttribute('data-index', -1);
      el.setAttribute('data-type', '');
      el.setAttribute('data-folder', '');
      el.setAttribute('readOnly', false);
      el.style.transform = '';
      iconImgEl.style.backgroundImage = '';
      iconImgEl.setAttribute('data-icon', '');
      titleEl.textContent = '';
      uriEl.textContent = '';
    },

    /**
     * Preload the item before and after the view item.
     * @param  {Number} index - current focus index.
     */
    loadItemBuffer: function(index) {
      var bufferIndex = 0;

      // preload the item before current focus item
      bufferIndex = index - MAX_VISIBLE_ITEM;
      if(bufferIndex >= 0 && bufferIndex < this.listIndexStartAt) {
        if(this.navState !== ROOT_FOLDER) {
          if(bufferIndex === 0) {
            var data = this.generateBackButtonData();
            this.addItem(0, data);
          } else {
            this.dispatchLoadDataByIndex(
              bufferIndex,
              bufferIndex - 1,
              this.navState
            );
          }
        } else {
          this.dispatchLoadDataByIndex(
            bufferIndex,
            bufferIndex,
            this.navState
          );
        }
      }

      // preload the item after current focus item
      bufferIndex = index + MAX_VISIBLE_ITEM;
      if(bufferIndex > this.listIndexEndAt) {
        if(this.navState !== ROOT_FOLDER) {
          this.dispatchLoadDataByIndex(
            bufferIndex,
            bufferIndex - 1,
            this.navState
          );
        } else {
          this.dispatchLoadDataByIndex(bufferIndex, bufferIndex, this.navState);
        }
      }
    },

    /**
     * Shift list item transform
     * @param  {Node} el - list item element to transform
     * @param  {Nunber} shift - shift transform, unit is rem
     */
    shiftItemTransform: function(el, shift) {
      var style = el.style.transform.split('('),
          transform = parseInt(style[1], 10);
      transform += shift;
      el.style.transform =
        'translateY(' + transform + 'rem) translateZ(0.01px)';
    },

    /**
     * Get Focus list element's uri content
     */
    getFocusItemUri: function() {
      var targetEl = this.listItemMap[this.focusIndex];
      return targetEl ? targetEl.querySelector('.uri').textContent : null;
    },

    /**
     * Get Focus list element's title content
     */
    getFocusItemTitle: function() {
      var targetEl = this.listItemMap[this.focusIndex];
      return targetEl ? targetEl.querySelector('.title').textContent : null;
    },

    /**
     * Update focus list element's title content
     * @param  {String} title - title to update
     */
    updateFocusItemTitle: function(title) {
      var targetEl = this.listItemMap[this.focusIndex];

      if(targetEl) {
        targetEl.querySelector('.title').textContent = title;
        var event = new Event('itemUpdated');
        this.el.dispatchEvent(event);
        this.focusItem(targetEl);
      }
    },

    /**
     * Get current user browse state.
     * @return {String} current user browse folder.
     */
    getCurNavHistory: function() {
      var len = this.navHistory.length;
      if(len > 0) {
        return this.navHistory[len - 1];
      } else {
        return null;
      }
    },

    /**
     * Generate back button data.
     * @return {Object} - back button data
     */
    generateBackButtonData: function() {
      return {
        type: 'button',
        title: 'Back to ' + this.navState
      };
    },

    /**
     * Move focus to the previous element
     */
    moveFocusIndexUp: function() {
      var targetEl = null;
      if(this.focusIndex > this.listIndexStartAt) {
        this.focusIndex -= 1;

        // if the new focus element is before this.listVisibleStartAt,
        // update list item's transform to shift down
        if(this.focusIndex < this.listVisibleStartAt) {
          this.listVisibleStartAt--;
          this.shiftItemTransform(this.listEl, LIST_ITEM_HEIGHT);
        }
        this.loadItemBuffer(this.focusIndex);
        targetEl = this.listItemMap[this.focusIndex];
        this.focusItem(targetEl);
      }
    },

    /**
     * Move focus to the next element
     */
    moveFocusIndexDown: function() {
      var targetEl = null;
      if(this.focusIndex < this.listIndexEndAt) {
        this.focusIndex += 1;

        // if the new focus element is after this.listIndexEndAt,
        // update list item's transform to shift up
        if ((this.focusIndex - this.listVisibleStartAt) ===
           MAX_VISIBLE_ITEM ) {
          this.listVisibleStartAt++;
          this.shiftItemTransform(this.listEl, (-1 * LIST_ITEM_HEIGHT));
        }
        this.loadItemBuffer(this.focusIndex);
        targetEl = this.listItemMap[this.focusIndex];
        this.focusItem(targetEl);
      }
    },

    handleItemKeyDown: function(e) {
      switch(e.keyCode){
        case KeyEvent.DOM_VK_UP:
          this.moveFocusIndexUp();
          e.stopPropagation();
          break;
        case KeyEvent.DOM_VK_DOWN:
          this.moveFocusIndexDown();
          e.stopPropagation();
          e.preventDefault();
          break;
        default:
          return;
      }
    },

    handleItemKeyUp: function(e) {
      switch(e.keyCode){
        case KeyEvent.DOM_VK_SUBMENU:
          this.handleKeySubmenu(e);
          break;
        case KeyEvent.DOM_VK_RETURN:
          this.handleKeyReturn(e);
          break;
        default:
          return;
      }
    },

    handleItemMouseUp: function(e) {
      switch(e.button){
        case 0 :
          // left click
          this.handleKeyReturn(e);
          break;
        case 2:
          //right click
          this.handleKeySubmenu(e);
          break;
        default:
          break;
      }
    },

    handleItemMouseOver: function(e) {
      var targetEl = e.currentTarget;
      if(targetEl) {
        var dataIndex = targetEl.getAttribute('data-index');
        var event = new CustomEvent('mouseOverItem', {detail: targetEl});
        targetEl.focus();
        this.focusIndex = parseInt(dataIndex, 10);
        this.el.dispatchEvent(event);
      }
    },

    handleItemMouseOut: function(e) {
      var targetEl = e.currentTarget;
      if(targetEl) {
        targetEl.blur();
      }
    },

    handleKeyReturn: function(e) {
      var targetEl = e.currentTarget,
          type = targetEl.getAttribute('data-type'),
          event = null,
          eventDetail = null;

      switch(type) {
        case 'folder':
          var folderId = targetEl.getAttribute('data-folder');
          eventDetail = {
            startAt: 0,
            number: MAX_VISIBLE_ITEM + 6,
            folderId: folderId,
            callback: (function(bookmarks) {
              this.navHistory.push(folderId);
              this.render(bookmarks);
              if(this.listIndexEndAt !== -1) {
                var focusEl = this.listItemMap[0];
                if(focusEl.getAttribute('data-type') === 'button') {
                  if(this.listIndexEndAt > 0){
                    focusEl = this.listItemMap[1];
                    this.focusIndex = 1;
                  }
                }
                this.focusItem(focusEl);
              }
            }).bind(this)
          };
          event = new CustomEvent('loadDataByRange', {detail: eventDetail});
          this.reset();
          this.el.dispatchEvent(event);
          break;
        case 'bookmark':
          var uriEL = targetEl.querySelector('.uri');
          if(uriEL) {
            this.dispatchDisplayWebsite(uriEL.textContent);
            this.close();
          }
          break;
        case 'button':
          this.navHistory.pop();
          this.navState = this.getCurNavHistory();
          eventDetail = {
            startAt: 0,
            number: MAX_VISIBLE_ITEM + 6,
            folderId: this.navState,
            callback: (function(bookmarks) {
              this.render(bookmarks);
              if(this.listIndexEndAt !== -1) {
                var focusEl = this.listItemMap[0];
                if(focusEl.getAttribute('data-type') === 'button') {
                  if(this.listIndexEndAt > 0){
                    focusEl = this.listItemMap[1];
                    this.focusIndex = 1;
                  }
                }
                this.focusItem(focusEl);
              }
            }).bind(this)
          };
          event = new CustomEvent('loadDataByRange', {detail: eventDetail});
          this.reset();
          this.el.dispatchEvent(event);
          break;
        default:
          break;
      }
    },

    handleKeySubmenu: function(e) {
      var targetEl = e.currentTarget;
      if(targetEl.getAttribute('readOnly') !== 'true') {
        var event = new Event('showSubMenu');
        this.el.dispatchEvent(event);
      }
    },

    dispatchDisplayWebsite: function(uri) {
      var event = new CustomEvent('displayWebsite', {detail: uri});
      this.el.dispatchEvent(event);
    },

    dispatchLoadDataByIndex: function(listIndex, dataIndex, navState) {
      var event = new CustomEvent('loadDataByIndex', {
        detail: {
          listIndex: listIndex,
          dataIndex: dataIndex,
          folderId: navState
        }});
      this.el.dispatchEvent(event);
    },
  };

  exports.BookmarkList = BookmarkList;
})(window);
