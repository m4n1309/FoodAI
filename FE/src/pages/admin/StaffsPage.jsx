import { Fragment, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth.js';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import staffApi from '../../services/staffService.js';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const StaffsPage = () => {
  const { user: currentUser } = useAuth();

  // Lists & States
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'waiter',
    isActive: true,
  });

  // Fetch staffs from API
  const fetchStaffs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (filterRole !== 'all') {
        params.role = filterRole;
      }

      if (filterStatus !== 'all') {
        params.isActive = filterStatus;
      }

      const response = await staffApi.getAll(params);
      setStaffs(response.data.staffs || []);
      setTotalItems(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Fetch staffs error:', error);
      toast.error('Không thể tải danh sách tài khoản nhân viên');
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterStatus, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterStatus]);

  // Handlers
  const handleOpenModal = (staff = null) => {
    if (staff) {
      setSelectedStaff(staff);
      setFormData({
        username: staff.username,
        password: '', // password left blank on edit
        fullName: staff.fullName,
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role,
        isActive: staff.isActive,
      });
    } else {
      setSelectedStaff(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'waiter',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStaff(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.role) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    if (!selectedStaff && !formData.password) {
      toast.error('Mật khẩu là bắt buộc khi tạo tài khoản mới');
      return;
    }

    try {
      setModalLoading(true);
      
      const payload = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (selectedStaff) {
        await staffApi.update(selectedStaff.id, payload);
        toast.success('Cập nhật tài khoản nhân viên thành công');
      } else {
        await staffApi.create(payload);
        toast.success('Tạo tài khoản nhân viên thành công');
      }

      handleCloseModal();
      fetchStaffs();
    } catch (error) {
      console.error('Submit staff account error:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDeleteDialog = (staff) => {
    setSelectedStaff(staff);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleDelete = async () => {
    try {
      setModalLoading(true);
      await staffApi.delete(selectedStaff.id);
      toast.success('Xóa tài khoản nhân viên thành công');
      handleCloseDeleteDialog();
      fetchStaffs();
    } catch (error) {
      console.error('Delete staff error:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'Không thể xóa tài khoản';
      toast.error(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Badge Helpers
  const getRoleBadge = (role) => {
    const roles = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      manager: 'bg-purple-100 text-purple-800 border-purple-200',
      waiter: 'bg-blue-100 text-blue-800 border-blue-200',
      kitchen: 'bg-amber-100 text-amber-800 border-amber-200',
      cashier: 'bg-teal-100 text-teal-800 border-teal-200',
    };
    
    const labels = {
      admin: 'Quản trị viên',
      manager: 'Quản lý',
      waiter: 'Phục vụ',
      kitchen: 'Nhân viên bếp',
      cashier: 'Thu ngân',
    };

    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${roles[role] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        Hoạt động
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        Khóa
      </span>
    );
  };

  return (
    <AdminLayout title="Quản lý Nhân viên">
      {/* Search and Action Toolbar */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Search bar */}
          <div className="flex-1 max-w-lg relative">
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên (Tên, SĐT, Username...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
            <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
          </div>

          {/* Add Staff Button */}
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm tài khoản
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="w-full sm:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full sm:w-48 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="waiter">Phục vụ</option>
              <option value="kitchen">Nhân viên bếp</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Accounts Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : staffs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-4">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlusIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Không tìm thấy tài khoản nhân viên nào</h3>
          <p className="text-sm text-gray-500 mt-1">Hãy tạo tài khoản nhân viên đầu tiên bằng nút "Thêm tài khoản".</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nhân viên</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tên đăng nhập</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Liên hệ</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {staffs.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                          {staff.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-semibold text-gray-900">{staff.fullName}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">{staff.username}</td>
                    <td className="whitespace-nowrap px-6 py-4">{getRoleBadge(staff.role)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>{staff.phone || '—'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{staff.email || '—'}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">{getStatusBadge(staff.isActive)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(staff)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteDialog(staff)}
                          disabled={String(staff.id) === String(currentUser?.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={String(staff.id) === String(currentUser?.id) ? "Không thể tự xóa bản thân" : "Xóa"}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50/50">
              <span className="text-sm text-gray-600">
                Trang {currentPage}/{totalPages} - Tổng {totalItems} nhân viên
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary py-1.5 px-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                >
                  Trước
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary py-1.5 px-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
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
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl transition-all border border-gray-50">
                  <Dialog.Title className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <ShieldCheckIcon className="w-8 h-8 text-primary-600" />
                    {selectedStaff ? 'Cập nhật tài khoản' : 'Thêm tài khoản nhân viên'}
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Họ và Tên <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleFormChange}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                        required
                        disabled={modalLoading}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Username */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleFormChange}
                          placeholder="Ví dụ: nva_waiter"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          required
                          disabled={modalLoading}
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          Mật khẩu {selectedStaff ? <span className="text-gray-400 font-normal">(để trống nếu không đổi)</span> : <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleFormChange}
                          placeholder="Mật khẩu bảo mật..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          required={!selectedStaff}
                          disabled={modalLoading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Role */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Vai trò <span className="text-red-500">*</span></label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleFormChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          required
                          disabled={modalLoading}
                        >
                          <option value="waiter">Phục vụ (Waiter)</option>
                          <option value="kitchen">Nhân viên bếp (Kitchen)</option>
                          <option value="admin">Quản trị viên (Admin)</option>
                        </select>
                      </div>

                      {/* Active Status */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">Trạng thái hoạt động</label>
                        <label className="flex items-center gap-3 cursor-pointer select-none py-2">
                          <input
                            type="checkbox"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleFormChange}
                            className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            disabled={modalLoading}
                          />
                          <span className="text-sm font-semibold text-gray-700">Kích hoạt tài khoản</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Số điện thoại</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleFormChange}
                          placeholder="Ví dụ: 0987654321"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          disabled={modalLoading}
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleFormChange}
                          placeholder="name@restaurant.com"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          disabled={modalLoading}
                        />
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 btn-secondary py-3.5"
                        disabled={modalLoading}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="flex-1 btn-primary py-3.5"
                        disabled={modalLoading}
                      >
                        {modalLoading ? 'Đang lưu...' : 'Lưu lại'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Xóa tài khoản nhân viên?"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${selectedStaff?.fullName}"? Nhân viên này sẽ không thể đăng nhập vào hệ thống nữa.`}
        confirmText="Xóa tài khoản"
        loading={modalLoading}
      />
    </AdminLayout>
  );
};

export default StaffsPage;
