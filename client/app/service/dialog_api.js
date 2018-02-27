'use strict';

const _extend = require('lodash/extend');
const consts = require('../consts');

class DialogApi {

  get params() {
    return this._getParams();
  }

  constructor(api, dialogFactory) {
    this.api = api;
    this.dialogFactory = dialogFactory;
    this.global = api.global;
    this._currentDialog = null;

    this.deferreds = {};
    this.confirmParams = {};
  }

  submit(success, data) {
    data = data || {};
    const message = this.generateMessageData(success, data);

    if (this.deferreds[this.params.dialogId]) {
      if (success) {
        this.deferreds[this.params.dialogId].resolve(message);
      } else {
        this.deferreds[this.params.dialogId].reject(message);
      }
    } else {
      this.api.messageToService('dialog:submit', message, this.params.openerIntegrationInstanceId);
    }
  }

  generateMessageData(success, data = {}) {
    const message = _extend({
      dialogId: this.params.dialogId,
      success: success
    }, data);

    if (this.confirmParams[this.params.dialogId]) {
      return _extend(message, this.confirmParams[this.params.dialogId]);
    }

    return message;
  }

  confirm(message) {
    if (!message.data.dialogId) {
      message.data.dialogId = this._generateDialogId();
    }

    if (message.data.params) {
      this.confirmParams[message.data.dialogId] = message.data.params;
    }

    this._currentDialog = this.dialogFactory.createConfirmDialog(this.global, message);
    this._currentDialog.render();

    if (message.source.integration_id === consts.EMARSYS_INTEGRATION_ID) {
      this.deferreds[message.data.dialogId] = this.global.$.Deferred(); // eslint-disable-line new-cap
      return this.deferreds[message.data.dialogId].promise();
    }
  }

  confirmNavigation(url, message) {
    let confirmPromise = this.confirm(message);

    confirmPromise.done(() => {
      this.global.$(this.global).off('beforeunload');
      this.global.location.href = url;
    }).fail(() => {
      this.close();
    });

    return confirmPromise;
  }

  modal(message) {
    this._currentDialog = this.dialogFactory.createModalDialog(this.global, message);
    this._currentDialog.render();
  }

  close() {
    this._currentDialog && this._currentDialog.close();
  }

  _generateDialogId() {
    return Math.floor(Math.random() * 10000000);
  }

  _getParams() {
    if (!this._currentDialog) {
      return {};
    }

    return JSON.parse(this._currentDialog.getAttribute('data-params'));
  }

}

module.exports = DialogApi;
