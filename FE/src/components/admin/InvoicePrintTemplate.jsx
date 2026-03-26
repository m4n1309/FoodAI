import { forwardRef } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const InvoicePrintTemplate = forwardRef(({ order, payments }, ref) => {
  if (!order) return null;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(order.totalAmount) - totalPaid);

  return (
    <div ref={ref} className="bg-white p-6 w-full max-w-[80mm] mx-auto text-black font-mono text-sm" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase mb-1">{import.meta.env.VITE_APP_NAME || 'Nhà Hàng DATN'}</h1>
        <p className="text-xs">Đ/c: 123 Đường Tên, Quận ABC, TP.HCM</p>
        <p className="text-xs">Hotline: 090 123 4567</p>
      </div>

      <div className="text-center mb-6 border-b border-dashed border-gray-400 pb-4">
        <h2 className="text-lg font-bold mb-2 uppercase">Hóa Đơn Thanh Toán</h2>
        <div className="flex justify-between text-xs mb-1">
          <span>Ngày:</span>
          <span>{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>Số HĐ:</span>
          <span>#{order.orderNumber.slice(-8)}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>Bàn:</span>
          <span>{order.table?.tableNumber || 'N/A'}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>Thu ngân:</span>
          <span>{order.staff?.fullName || 'Admin'}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4">
        <div className="flex justify-between font-bold border-b border-dashed border-gray-400 pb-2 mb-2 text-xs">
          <span className="w-1/2">Món</span>
          <span className="w-1/4 text-right">SL</span>
          <span className="w-1/4 text-right">Tổng</span>
        </div>
        {(order.items || []).map((item, idx) => (
          <div key={idx} className="flex justify-between mb-2 text-xs">
            <span className="w-1/2 break-words pr-2">{item.itemName}</span>
            <span className="w-1/4 text-right">{item.quantity}</span>
            <span className="w-1/4 text-right">{formatMoney(item.totalPrice)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-gray-400 pt-4 mb-4 text-xs">
        <div className="flex justify-between mb-1">
          <span>Tạm tính:</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        {Number(order.taxAmount) > 0 && (
          <div className="flex justify-between mb-1">
            <span>Thuế/VAT:</span>
            <span>{formatMoney(order.taxAmount)}</span>
          </div>
        )}
        {Number(order.serviceCharge) > 0 && (
          <div className="flex justify-between mb-1">
            <span>Phí dịch vụ:</span>
            <span>{formatMoney(order.serviceCharge)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-gray-400">
          <span>TỔNG CỘNG:</span>
          <span>{formatMoney(order.totalAmount)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-t border-dashed border-gray-400 pt-4 text-xs">
        <div className="flex justify-between mb-1 text-gray-700">
          <span>Đã thanh toán:</span>
          <span>{formatMoney(totalPaid)}</span>
        </div>
        {remaining > 0 && (
           <div className="flex justify-between font-bold mb-1">
            <span>Còn lại:</span>
            <span>{formatMoney(remaining)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-xs italic">
        <p>Cảm ơn quý khách và hẹn gặp lại!</p>
        <p className="mt-1">Powered by RestaurantSystem</p>
      </div>
    </div>
  );
});

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';
export default InvoicePrintTemplate;
