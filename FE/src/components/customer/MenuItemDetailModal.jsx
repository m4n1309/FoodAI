import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { StarIcon, HeartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ImageWithFallback from '../common/ImageWithFallback';

const formatMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('vi-VN') + 'đ';
};

const MenuItemDetailModal = ({ open, onClose, menuItem, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);

  if (!menuItem) return null;

  const basePrice = Number(menuItem.discountPrice ?? menuItem.price);
  const total = basePrice * quantity;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-0 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-4xl transform overflow-hidden bg-white text-left align-middle shadow-2xl transition-all sm:rounded-[2rem] flex flex-col md:flex-row max-h-[100dvh] sm:max-h-[90vh]">
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md rounded-full p-2 text-gray-500 hover:text-gray-900 shadow-sm transition-all"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Left Side: Image */}
                <div className="md:w-1/2 relative bg-gray-100 h-64 md:h-auto shrink-0">
                   <ImageWithFallback 
                     src={menuItem.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"} 
                     alt={menuItem.name} 
                     className="w-full h-full object-cover"
                   />
                </div>

                {/* Right Side: Content */}
                <div className="md:w-1/2 flex flex-col h-full bg-[#fffcfb]">
                   {/* Scrollable area */}
                   <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                      <div className="flex justify-between items-start mb-2">
                        <Dialog.Title as="h3" className="text-3xl font-black text-gray-900 leading-tight">
                          {menuItem.name}
                        </Dialog.Title>
                        <button className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm ml-4">
                          <HeartIcon className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-orange-100">
                        <span className="text-2xl font-black text-primary-600">{formatMoney(basePrice)}</span>
                        {menuItem.discountPrice && <span className="text-sm text-gray-400 line-through font-medium">{formatMoney(menuItem.price)}</span>}
                      </div>

                      <p className="text-sm text-gray-600 mb-8 font-medium leading-relaxed">
                        {menuItem.description || "Hương vị trọn vẹn, được chế biến từ những nguyên liệu tươi ngon nhất."}
                      </p>
                   </div>

                   {/* Bottom Action Bar */}
                   <div className="bg-white border-t border-orange-100 p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-between w-full sm:w-auto">
                        <div className="flex flex-col sm:hidden">
                           <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tổng cộng</span>
                           <span className="text-2xl font-black text-primary-600">{formatMoney(total)}</span>
                        </div>
                        <div className="flex items-center gap-4 bg-orange-50 rounded-full p-1 border border-orange-100">
                           <button 
                             className="w-10 h-10 rounded-full bg-white text-gray-600 shadow-sm hover:text-primary-600 flex items-center justify-center disabled:opacity-50"
                             onClick={() => setQuantity(Math.max(1, quantity - 1))}
                             disabled={quantity <= 1}
                           >
                             <MinusIcon className="w-4 h-4" />
                           </button>
                           <span className="w-4 text-center font-black text-gray-900">{quantity}</span>
                           <button 
                             className="w-10 h-10 rounded-full bg-white text-gray-600 shadow-sm hover:text-primary-600 flex items-center justify-center"
                             onClick={() => setQuantity(quantity + 1)}
                           >
                             <PlusIcon className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                      <button 
                        className="w-full sm:flex-1 bg-primary-700 text-white rounded-full py-4 font-black uppercase tracking-widest hover:bg-primary-800 transition-colors shadow-xl shadow-primary-700/20 flex items-center justify-center gap-2"
                        onClick={() => {
                          onClose();
                          if (onAddToCart) onAddToCart(menuItem.id, quantity);
                        }}
                      >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                         Thêm vào giỏ • {formatMoney(total)}
                      </button>
                   </div>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MenuItemDetailModal;
