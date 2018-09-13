"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    SaveState: `
  static action(
    _context: TnoAuthContext,
    _params: any,
    body: any,
    state: any,
    callback: TSaveStateCallback
  ): void {
    const { item: { name } } = body
    const { items = [] }: any = state
    const newItem: any = { name }

    callback({
      state: {
        ...state,
        items: [...items, newItem]
      },
      data: [...items, newItem]
    })
  }
  `,
    RetrieveState: `
  static action(_context: TnoAuthContext, _params: any, state, callback: TRetrieveStateCallback) {
    callback({ data: state })
  }
  `,
    FetchData: `
  static action(context: TnoAuthContext, params: any, body: any, callback: TFetchDataCallback) {
    //... your code goes here
    callback({ data: []})
  }`
};