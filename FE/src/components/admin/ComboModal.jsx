import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import menuItemApi from '../../services/menuItemService.js';
import { useAuth } from '../../hooks/useAuth.js';

const ComboModal = ({ isOpen, onClose, combo, onSubmit, loading }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    imageUrl: '',
    isAvailable: true,
    items: []
  });

  const [allMenuItems, setAllMenuItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllMenuItems = useCallback(async () => {
    try {
      const resp = await menuItemApi.getAll({ restaurantId: user?.restaurantId, limit: 1000 });
      setAllMenuItems(resp.data.menuItems || []);
    } catch (err) {
      console.error(err);
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    if (isOpen) {
      if (combo) {
        setFormData({
          name: combo.name || '',
          description: combo.description || '',
          price: combo.price || '',
          discountPrice: combo.discountPrice || '',
          imageUrl: combo.imageUrl || '',
          isAvailable: combo.isAvailable ?? true,
          items: combo.items?.map(it => ({
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            itemName: it.menuItem?.name
          })) || []
        });
      } else {
        setFormData({
          name: '',
          description: '',
          price: '',
          discountPrice: '',
          imageUrl: '',
          isAvailable: true,
          items: []
        });
      }
      fetchAllMenuItems();
    }
  }, [isOpen, combo, fetchAllMenuItems]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addItemToCombo = (mi) => {
    if (formData.items.find(it => it.menuItemId === mi.id)) return;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { menuItemId: mi.id, quantity: 1, itemName: mi.name }]
    }));
  };

  const removeItemFromCombo = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(it => it.menuItemId !== id)
    }));
  };

  const updateItemQuantity = (id, qty) => {
    if (isNaN(qty) || qty < 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => it.menuItemId === id ? { ...it, quantity: qty } : it)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  const filteredMenuItems = allMenuItems.filter(mi =>
    mi.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !formData.items.find(it => it.menuItemId === mi.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {combo ? 'Chỉnh sửa Combo' : 'Thêm Combo mới'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left col: Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Tên Combo *</label>
                    <input
                      type="text" name="name" required
                      value={formData.name} onChange={handleChange}
                      className="input-field"
                      placeholder="Ví dụ: Combo Gia đình"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Mô tả</label>
                    <textarea
                      name="description" rows="3"
                      value={formData.description} onChange={handleChange}
                      className="input-field"
                      placeholder="Mô tả các món hoặc đối tượng khách hàng..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Giá gốc *</label>
                      <input
                        type="number" name="price" required
                        value={formData.price} onChange={handleChange}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Giá khuyến mãi</label>
                      <input
                        type="number" name="discountPrice"
                        value={formData.discountPrice} onChange={handleChange}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Ảnh (URL)</label>
                    <input
                      type="text" name="imageUrl"
                      value={formData.imageUrl} onChange={handleChange}
                      className="input-field"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox" name="isAvailable"
                      checked={formData.isAvailable} onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                      id="isAvailable_check"
                    />
                    <label htmlFor="isAvailable_check" className="ml-2 block text-sm text-gray-900 cursor-pointer">Đang kinh doanh (Hiện trên menu)</label>
                  </div>
                </div>

                {/* Right col: Combo Items */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">Món ăn trong Combo ({formData.items.length})</label>
                  
                  {/* Selected Items */}
                  <div className="border border-gray-200 rounded-xl p-2 min-h-[180px] max-h-[250px] overflow-y-auto space-y-2 bg-gray-50">
                    {formData.items.map(it => (
                      <div key={it.menuItemId} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                        <span className="font-semibold text-gray-800">{it.itemName}</span>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center border rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(it.menuItemId, Math.max(1, it.quantity - 1))}
                              className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                            >-</button>
                            <span className="px-2 font-medium min-w-[30px] text-center">{it.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(it.menuItemId, it.quantity + 1)}
                              className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                            >+</button>
                          </div>
                          <button
                            type="button" onClick={() => removeItemFromCombo(it.menuItemId)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {formData.items.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12">
                         <PlusIcon className="h-8 w-8 text-gray-300 mb-2" />
                         <p className="text-gray-400 text-sm italic">Chưa chọn món nào</p>
                      </div>
                    )}
                  </div>

                  {/* Search and Add */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Thêm món ăn</label>
                    <input
                      type="text" placeholder="Tìm kiếm món ăn theo tên..."
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field"
                    />
                    <div className="border border-gray-200 rounded-xl max-h-[150px] overflow-y-auto bg-white shadow-inner">
                      {filteredMenuItems.map(mi => (
                        <div
                          key={mi.id}
                          className="flex items-center justify-between p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 transition-colors last:border-0"
                          onClick={() => addItemToCombo(mi)}
                        >
                          <span className="text-sm text-gray-700">{mi.name}</span>
                          <PlusIcon className="h-4 w-4 text-indigo-600" />
                        </div>
                      ))}
                      {filteredMenuItems.length === 0 && (
                        <p className="p-4 text-center text-xs text-gray-400">
                          {searchTerm ? 'Không tìm thấy món ăn nào' : 'Gõ tên món để tìm'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit" disabled={loading}
                className="btn-primary w-full sm:w-auto flex items-center justify-center"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                {combo ? 'Lưu thay đổi' : 'Tạo Combo ngay'}
              </button>
              <button
                type="button" onClick={onClose}
                className="btn-secondary w-full sm:w-auto"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

ComboModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  combo: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default ComboModal;
