import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import httpClient from '../../services/httpClient.js';

const CategoryModal = ({ isOpen, onClose, category, onSubmit, loading }) => {
  const isEdit = !!category;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
    },
  });

  const watchImageUrl = watch('imageUrl');

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (category) {
      reset({
        name: category.name || '',
        description: category.description || '',
        imageUrl: category.imageUrl || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        imageUrl: '',
      });
    }
    setUploadError(null);
  }, [category, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await httpClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setValue('imageUrl', response.url);
    } catch (err) {
      console.error('Failed to upload image:', err);
      setUploadError(err.response?.data?.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
    }
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Tên danh mục <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      {...register('name', {
                        required: 'Tên danh mục là bắt buộc',
                        minLength: {
                          value: 2,
                          message: 'Tên phải có ít nhất 2 ký tự',
                        },
                      })}
                      className="input-field"
                      placeholder="VD: Món khai vị"
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      {...register('description')}
                      className="input-field"
                      placeholder="Mô tả về danh mục..."
                      disabled={loading}
                    />
                  </div>

                  {/* Image URL & Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hình ảnh danh mục
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      {watchImageUrl && (
                        <img
                          src={watchImageUrl}
                          alt="Preview"
                          className="h-16 w-16 object-cover rounded-md border border-gray-200"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <input
                          id="imageUrl"
                          type="url"
                          {...register('imageUrl', {
                            pattern: {
                              value: /^https?:\/\/.+/,
                              message: 'URL không hợp lệ',
                            },
                          })}
                          className="input-field"
                          placeholder="https://example.com/image.jpg"
                          disabled={loading || uploading}
                        />
                        <div className="flex items-center space-x-2">
                          <label className={`btn-secondary text-xs cursor-pointer py-1.5 px-3 block text-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploading ? 'Đang tải lên...' : 'Tải ảnh từ máy'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                              disabled={loading || uploading}
                            />
                          </label>
                          {uploadError && (
                            <span className="text-xs text-red-600">{uploadError}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {errors.imageUrl && (
                      <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-4">
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

export default CategoryModal;