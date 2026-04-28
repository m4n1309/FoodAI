import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import ImageWithFallback from '../common/ImageWithFallback';

const ComboDetailModal = ({ open, onClose, combo, onAdd }) => {
  if (!open || !combo) return null;

  const formatMoney = (v) => {
    return Number(v || 0).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60 transition-opacity backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-all sm:rounded-3xl animate-in slide-in-from-bottom duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-gray-800 shadow-sm backdrop-blur-md hover:bg-white transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="h-56 w-full">
          <ImageWithFallback
            src={combo.imageUrl}
            alt={combo.name}
            className="h-full w-full object-cover"
            aspectRatio="video"
          />
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900">{combo.name}</h2>
          
          <div className="mt-2 flex items-baseline gap-2">
            {combo.discountPrice ? (
              <>
                <span className="text-2xl font-extrabold text-red-600">{formatMoney(combo.discountPrice)}</span>
                <span className="text-sm text-gray-400 line-through">{formatMoney(combo.price)}</span>
              </>
            ) : (
              <span className="text-2xl font-extrabold text-gray-900">{formatMoney(combo.price)}</span>
            )}
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Mô tả</h3>
            <p className="mt-1 text-gray-600 text-sm leading-relaxed">{combo.description || 'Bữa ăn kết hợp đầy dinh dưỡng dành cho bạn.'}</p>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Thành phần Combo</h3>
            <div className="mt-3 space-y-2">
              {combo.items?.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-gray-50 bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                   <div className="h-12 w-12 flex-shrink-0">
                      <ImageWithFallback src={it.menuItem?.imageUrl} alt={it.menuItem?.name} className="h-full w-full rounded-xl object-cover shadow-sm" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{it.menuItem?.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Số lượng trong combo: <span className="text-indigo-600 font-bold">{it.quantity}</span></p>
                   </div>
                </div>
              ))}
              {(!combo.items || combo.items.length === 0) && (
                <p className="text-center text-xs text-gray-400 italic py-4">Chưa có thông tin món ăn con</p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              onAdd(combo.id);
              onClose();
            }}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            disabled={!combo.isAvailable}
          >
            <ShoppingBagIcon className="h-6 w-6" />
            {combo.isAvailable ? 'Thêm vào giỏ hàng' : 'Tạm hết món'}
          </button>
        </div>
      </div>
    </div>
  );
};

ComboDetailModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  combo: PropTypes.object,
  onAdd: PropTypes.func.isRequired,
};

export default ComboDetailModal;
