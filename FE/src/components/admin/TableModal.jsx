import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';

const TableModal = ({ isOpen, onClose, table, onSubmit, loading }) => {
  const isEdit = !!table;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      tableNumber: '',
      capacity: 4,
      location: '',
      status: 'available',
      isActive: true,
    },
  });

  // Reset form khi modal opens/closes
  useEffect(() => {
    if (table) {
      reset({
        tableNumber: table.tableNumber || '',
        capacity: table.capacity || 4,
        location: table.location || '',
        status: table.status || 'available',
        isActive: table.isActive ?? true,
      });
    } else {
      reset({
        tableNumber: '',
        capacity: 4,
        location: '',
        status: 'available',
        isActive: true,
      });
    }
  }, [table, reset]);

  const handleFormSubmit = (data) => {
    const formattedData = {
      ...data,
      capacity: parseInt(data.capacity) || 4,
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {isEdit ? 'Chỉnh sửa bàn ăn' : 'Thêm bàn ăn mới'}
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
                  {/* Table Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số bàn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('tableNumber', {
                        required: 'Số bàn là bắt buộc',
                      })}
                      className="input-field"
                      placeholder="VD: B01, A-12"
                      disabled={loading}
                    />
                    {errors.tableNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.tableNumber.message}</p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sức chứa (người)
                    </label>
                    <input
                      type="number"
                      {...register('capacity', {
                        min: { value: 1, message: 'Tối thiểu 1 người' },
                        max: { value: 20, message: 'Tối đa 20 người' },
                      })}
                      className="input-field"
                      placeholder="4"
                      disabled={loading}
                    />
                    {errors.capacity && (
                      <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vị trí
                    </label>
                    <input
                      type="text"
                      {...register('location')}
                      className="input-field"
                      placeholder="VD: Tầng 1, Khu vườn"
                      disabled={loading}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      {...register('status')}
                      className="input-field"
                      disabled={loading}
                    >
                      <option value="available">Trống</option>
                      <option value="occupied">Đang sử dụng</option>
                      <option value="reserved">Đã đặt</option>
                      <option value="maintenance">Bảo trì</option>
                    </select>
                  </div>

                  {/* Active status */}
                  <div className="flex items-center">
                    <input
                      id="isActive"
                      type="checkbox"
                      {...register('isActive')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      Kích hoạt bàn
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
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
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

TableModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  table: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    tableNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    capacity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    location: PropTypes.string,
    status: PropTypes.oneOf(['available', 'occupied', 'reserved', 'maintenance']),
    isActive: PropTypes.bool,
  }),
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default TableModal;