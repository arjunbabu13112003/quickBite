export enum LedgerEntryType {
  CUSTOMER_PAYMENT = 'customer_payment',
  COD_CASH_COLLECTED = 'cod_cash_collected',  // Driver physically collected cash — distinct from online payment receipt
  HOTEL_PAYABLE = 'hotel_payable',
  PLATFORM_COMMISSION = 'platform_commission',
  DELIVERY_PARTNER_PAYABLE = 'delivery_partner_payable',
  REFUND = 'refund',
  SETTLEMENT = 'settlement',
  PAYOUT = 'payout',
  ADJUSTMENT = 'adjustment',
}
