import React from 'react';

const MenuItemDetailModal = ({ open, onClose, menuItem }) => {
  if (!open || !menuItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl relative">
        <button
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
        <div className="text-xl font-bold mb-2">{menuItem.name}</div>
        {menuItem.imageUrl && (
          <img src={menuItem.imageUrl} alt={menuItem.name} className="mb-3 w-full h-48 object-cover rounded-lg" />
        )}
        <div className="mb-2 text-gray-700">{menuItem.description}</div>
        <div className="mb-2 text-gray-900 font-semibold">
          Giá: {menuItem.discountPrice ? (
            <>
              <span>{menuItem.discountPrice.toLocaleString('vi-VN')} đ</span>
              <span className="ml-2 text-gray-500 line-through">{menuItem.price.toLocaleString('vi-VN')} đ</span>
            </>
          ) : (
            <span>{menuItem.price.toLocaleString('vi-VN')} đ</span>
          )}
        </div>
        {/* Thêm các thông tin khác nếu cần */}
      </div>
    </div>
  );
};

export default MenuItemDetailModal;
