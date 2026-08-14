export enum AccountType {
  PLATFORM = 'platform',
  HOTEL = 'hotel',
  DELIVERY_PARTNER = 'delivery_partner',
  /**
   * Cash physically held by a delivery partner after COD collection.
   * This is NOT a platform bank account entry. The driver holds the cash
   * until they remit it to QuickBite (a future reconciliation step).
   * Using this distinct account type prevents falsely crediting the platform
   * bank balance with COD cash.
   */
  DELIVERY_PARTNER_CASH_HELD = 'delivery_partner_cash_held',
}
