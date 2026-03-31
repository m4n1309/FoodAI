import { useState, useEffect } from 'react';

const PromotionModal = ({ isOpen, onClose, promotion, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    validFrom: '',
    validUntil: '',
    isActive: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (promotion) {
      setFormData({
        code: promotion.code || '',
        name: promotion.name || '',
        description: promotion.description || '',
        discountType: promotion.discountType || 'percentage',
        discountValue: promotion.discountValue || '',
        minOrderAmount: promotion.minOrderAmount || '',
        maxDiscountAmount: promotion.maxDiscountAmount || '',
        usageLimit: promotion.usageLimit || '',
        validFrom: promotion.validFrom ? new Date(promotion.validFrom).toISOString().slice(0, 16) : '',
        validUntil: promotion.validUntil ? new Date(promotion.validUntil).toISOString().slice(0, 16) : '',
        isActive: promotion.isActive ?? true
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '',
        maxDiscountAmount: '',
        usageLimit: '',
        validFrom: '',
        validUntil: '',
        isActive: true
      });
    }
    setErrors({});
  }, [promotion, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = 'Mã khuyến mãi là bắt buộc';
    if (!formData.name.trim()) newErrors.name = 'Tên khuyến mãi là bắt buộc';
    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      newErrors.discountValue = 'Giá trị giảm giá phải lớn hơn 0';
    }
    if (!formData.validFrom) newErrors.validFrom = 'Ngày bắt đầu là bắt buộc';
    if (!formData.validUntil) newErrors.validUntil = 'Ngày kết thúc là bắt buộc';
    if (formData.validFrom && formData.validUntil && new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      newErrors.validUntil = 'Ngày kết thúc phải sau ngày bắt đầu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const payload = { ...formData };
      ['discountValue', 'minOrderAmount', 'maxDiscountAmount', 'usageLimit'].forEach(key => {
        if (payload[key] === '') payload[key] = null;
        else if (payload[key] !== null) payload[key] = Number(payload[key]);
      });
      // Convert datetime-local to ISO full string before sending
      if (payload.validFrom) payload.validFrom = new Date(payload.validFrom).toISOString();
      if (payload.validUntil) payload.validUntil = new Date(payload.validUntil).toISOString();
      onSubmit(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col pt-6 pb-2 px-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{promotion ? 'Cập nhật Voucher' : 'Thêm Voucher Mới'}</h2>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Voucher *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 uppercase ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="VD: SUMMER2026"
                />
                {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="VD: Giảm 20% tháng hè"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Mô tả cho khách hàng đọc..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="fixed_amount">Trừ thẳng tiền (VNĐ)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị giảm *</label>
                <input
                  type="number"
                  name="discountValue"
                  value={formData.discountValue}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.discountValue ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder={formData.discountType === 'percentage' ? '20' : '50000'}
                  min="1"
                />
                {errors.discountValue && <p className="mt-1 text-sm text-red-500">{errors.discountValue}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={formData.minOrderAmount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giảm tối đa (VNĐ)</label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Không giới hạn"
                  disabled={formData.discountType === 'fixed_amount'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn số lần dùng</label>
                <input
                  type="number"
                  name="usageLimit"
                  value={formData.usageLimit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Không giới hạn"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày *</label>
                <input
                  type="datetime-local"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.validFrom ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.validFrom && <p className="mt-1 text-sm text-red-500">{errors.validFrom}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày *</label>
                <input
                  type="datetime-local"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.validUntil ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.validUntil && <p className="mt-1 text-sm text-red-500">{errors.validUntil}</p>}
              </div>
            </div>

            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 font-medium">
                Công khai khả dụng
              </label>
            </div>
          </form>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-2 mb-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400">
            {loading ? 'Đang lưu...' : 'Lưu voucher'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
