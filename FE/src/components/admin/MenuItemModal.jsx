import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import categoryApi from '../../api/categoryApi';
import { useAuth } from '../../context/AuthContext';

const MenuItemModal = ({ isOpen, onClose, menuItem, onSubmit, loading }) => {
  const { user } = useAuth();
  const isEdit = !!menuItem;
  const [categories, setCategories] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      description: '',
      price: '',
      discountPrice: '',
      imageUrl: '',
      preparationTime: '',
      calories: '',
      ingredients: '',
      allergens: '',
      isVegetarian: false,
      isSpicy: false,
    },
  });

  const price = watch('price');
  const discountPrice = watch('discountPrice');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAll({
          restaurantId: user?.restaurantId,
          isActive: true,
        });
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('Fetch categories error:', error);
      }
    };

    if (isOpen && user?.restaurantId) {
      fetchCategories();
    }
  }, [isOpen, user]);

  // Reset form when modal opens/closes or menuItem changes
  useEffect(() => {
    if (menuItem) {
      reset({
        name: menuItem.name || '',
        categoryId: menuItem.categoryId || '',
        description: menuItem.description || '',
        price: menuItem.price || '',
        discountPrice: menuItem.discountPrice || '',
        imageUrl: menuItem.imageUrl || '',
        preparationTime: menuItem.preparationTime || '',
        calories: menuItem.calories || '',
        ingredients: menuItem.ingredients || '',
        allergens: menuItem.allergens || '',
        isVegetarian: menuItem.isVegetarian || false,
        isSpicy: menuItem.isSpicy || false,
      });
    } else {
      reset({
        name: '',
        categoryId: '',
        description: '',
        price: '',
        discountPrice: '',
        imageUrl: '',
        preparationTime: '',
        calories: '',
        ingredients: '',
        allergens: '',
        isVegetarian: false,
        isSpicy: false,
      });
    }
  }, [menuItem, reset]);

  const handleFormSubmit = (data) => {
    // Convert numeric fields
    const formattedData = {
      ...data,
      categoryId: data.categoryId ? parseInt(data.categoryId) : null,
      price: parseFloat(data.price),
      discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : null,
      preparationTime: data.preparationTime ? parseInt(data.preparationTime) : null,
      calories: data.calories ? parseInt(data.calories) : null,
    };

    onSubmit(formattedData);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {isEdit ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                  {/* Grid 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên món ăn <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('name', {
                          required: 'Tên món ăn là bắt buộc',
                          minLength: {
                            value: 2,
                            message: 'Tên phải có ít nhất 2 ký tự',
                          },
                        })}
                        className="input-field"
                        placeholder="VD: Phở bò"
                        disabled={loading}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Danh mục
                      </label>
                      <select
                        {...register('categoryId')}
                        className="input-field"
                        disabled={loading}
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1000"
                          {...register('price', {
                            required: 'Giá là bắt buộc',
                            min: {
                              value: 0,
                              message: 'Giá phải lớn hơn 0',
                            },
                          })}
                          className="input-field pr-12"
                          placeholder="50000"
                          disabled={loading}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                          đ
                        </span>
                      </div>
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                      )}
                    </div>

                    {/* Discount Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá khuyến mãi
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1000"
                          {...register('discountPrice', {
                            validate: (value) => {
                              if (value && price && parseFloat(value) >= parseFloat(price)) {
                                return 'Giá KM phải nhỏ hơn giá gốc';
                              }
                              return true;
                            },
                          })}
                          className="input-field pr-12"
                          placeholder="45000"
                          disabled={loading}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                          đ
                        </span>
                      </div>
                      {errors.discountPrice && (
                        <p className="mt-1 text-sm text-red-600">{errors.discountPrice.message}</p>
                      )}
                    </div>

                    {/* Preparation Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian chuẩn bị (phút)
                      </label>
                      <input
                        type="number"
                        {...register('preparationTime')}
                        className="input-field"
                        placeholder="15"
                        disabled={loading}
                      />
                    </div>

                    {/* Calories */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        {...register('calories')}
                        className="input-field"
                        placeholder="450"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <textarea
                      rows={3}
                      {...register('description')}
                      className="input-field"
                      placeholder="Mô tả về món ăn..."
                      disabled={loading}
                    />
                  </div>

                  {/* Ingredients */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nguyên liệu
                    </label>
                    <textarea
                      rows={2}
                      {...register('ingredients')}
                      className="input-field"
                      placeholder="VD: Bánh phở, thịt bò, hành, rau thơm..."
                      disabled={loading}
                    />
                  </div>

                  {/* Allergens */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chất gây dị ứng
                    </label>
                    <input
                      type="text"
                      {...register('allergens')}
                      className="input-field"
                      placeholder="VD: Gluten, đậu phộng, hải sản..."
                      disabled={loading}
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL hình ảnh
                    </label>
                    <input
                      type="url"
                      {...register('imageUrl', {
                        pattern: {
                          value: /^https?:\/\/.+/,
                          message: 'URL không hợp lệ',
                        },
                      })}
                      className="input-field"
                      placeholder="https://example.com/image.jpg"
                      disabled={loading}
                    />
                    {errors.imageUrl && (
                      <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
                    )}
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isVegetarian')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Món chay</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isSpicy')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Món cay</span>
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 btn-secondary"
                      disabled={loading}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang xử lý...
                        </>
                      ) : (
                        isEdit ? 'Cập nhật' : 'Tạo mới'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MenuItemModal;