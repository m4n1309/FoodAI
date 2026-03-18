import { Fragment, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth.js';
import AdminLayout from '../../components/admin/AdminLayout';
import TableModal from '../../components/admin/TableModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import tableApi from '../../services/tableService.js';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const TablesPage = () => {
  const { user } = useAuth();

  // State
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // QR code state
  const [qrCodeData, setQrCodeData] = useState(null);

  // Fetch tables
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        restaurantId: user?.restaurantId,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterLocation !== 'all') {
        params.location = filterLocation;
      }

      const response = await tableApi.getAll(params);
      setTables(response.data.tables || []);
    } catch (error) {
      console.error('Fetch tables error:', error);
      toast.error('Không thể tải danh sách bàn ăn');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, filterStatus, filterLocation]);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchTables();
    }
  }, [user?.restaurantId, fetchTables]);

  // Client-side filtering (search)
  const filteredTables = tables.filter((table) =>
    table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique locations
  const locations = [...new Set(tables.map(t => t.location).filter(Boolean))];

  // CRUD Handlers
  const handleOpenModal = (table = null) => {
    setSelectedTable(table);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTable(null);
  };

  const handleSubmit = async (data) => {
    try {
      setModalLoading(true);

      const tableData = {
        ...data,
        restaurantId: user.restaurantId,
      };

      if (selectedTable) {
        await tableApi.update(selectedTable.id, tableData);
        toast.success('Cập nhật bàn ăn thành công');
      } else {
        await tableApi.create(tableData);
        toast.success('Tạo bàn ăn thành công');
      }

      handleCloseModal();
      fetchTables();
    } catch (error) {
      console.error('Submit table error:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDeleteDialog = (table) => {
    setSelectedTable(table);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedTable(null);
  };

  const handleDelete = async () => {
    try {
      setModalLoading(true);
      await tableApi.delete(selectedTable.id);
      toast.success('Xóa bàn ăn thành công');
      handleCloseDeleteDialog();
      fetchTables();
    } catch (error) {
      console.error('Delete table error:', error);
      const message = error.response?.data?.message || 'Không thể xóa bàn ăn';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // Status handlers
  const handleChangeStatus = async (table, newStatus) => {
    try {
      await tableApi.updateStatus(table.id, newStatus);
      toast.success('Cập nhật trạng thái thành công');
      fetchTables();
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  // QR code handlers
  const handleShowQRCode = async (table) => {
    setSelectedTable(table);
    setQrCodeData(table.qrCode);
    setIsQRDialogOpen(true);
  };

  const handleRegenerateQRCode = async (table) => {
    try {
      const response = await tableApi.generateQRCode(table.id, {
        regenerate: true,
        format: 'url',
      });
      toast.success('Tạo mã QR mới thành công');
      setQrCodeData(response.data.qrCode);
      fetchTables();
    } catch (error) {
      console.error('Generate QR error:', error);
      toast.error('Không thể tạo mã QR');
    }
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeData) return;

    // Create download link
    const link = document.createElement('a');
    link.href = qrCodeData;
    link.download = `table-${selectedTable?.tableNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải xuống mã QR');
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      reserved: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      available: 'Trống',
      occupied: 'Đang dùng',
      reserved: 'Đã đặt',
      maintenance: 'Bảo trì',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <AdminLayout title="Quản lý Bàn ăn">
      {/* Header Actions */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-4">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm bàn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center lg:justify-start"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Thêm bàn ăn
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field flex-1 min-w-[150px]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Trống</option>
            <option value="occupied">Đang sử dụng</option>
            <option value="reserved">Đã đặt</option>
            <option value="maintenance">Bảo trì</option>
          </select>

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="input-field flex-1 min-w-[150px]"
          >
            <option value="all">Tất cả vị trí</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Tổng bàn</p>
          <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Trống</p>
          <p className="text-2xl font-bold text-green-600">
            {tables.filter((t) => t.status === 'available').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Đang dùng</p>
          <p className="text-2xl font-bold text-red-600">
            {tables.filter((t) => t.status === 'occupied').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Đã đặt</p>
          <p className="text-2xl font-bold text-yellow-600">
            {tables.filter((t) => t.status === 'reserved').length}
          </p>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {searchTerm
              ? 'Không tìm thấy bàn nào'
              : 'Chưa có bàn ăn nào. Hãy tạo bàn đầu tiên!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className="card hover:shadow-lg transition-shadow"
            >
              {/* Table info */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Bàn {table.tableNumber}
                  </h3>
                  {table.location && (
                    <p className="text-sm text-gray-600">{table.location}</p>
                  )}
                </div>
                {getStatusBadge(table.status)}
              </div>

              {/* Capacity */}
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Sức chứa: {table.capacity} người</span>
              </div>

              {/* QR Code button */}
              <button
                onClick={() => handleShowQRCode(table)}
                className="w-full mb-3 btn-secondary flex items-center justify-center"
              >
                <QrCodeIcon className="h-5 w-5 mr-2" />
                Xem mã QR
              </button>

              {/* Status change dropdown */}
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">Thay đổi trạng thái:</label>
                <select
                  value={table.status}
                  onChange={(e) => handleChangeStatus(table, e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="available">Trống</option>
                  <option value="occupied">Đang sử dụng</option>
                  <option value="reserved">Đã đặt</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleOpenModal(table)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Chỉnh sửa"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRegenerateQRCode(table)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Tạo lại mã QR"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleOpenDeleteDialog(table)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                  title="Xóa"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <TableModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        table={selectedTable}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Xóa bàn ăn?"
        message={`Bạn có chắc chắn muốn xóa bàn "${selectedTable?.tableNumber}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        loading={modalLoading}
      />

      {/* QR Code Dialog */}
      <Transition appear show={isQRDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsQRDialogOpen(false)}>
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
                  <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4">
                    Mã QR - Bàn {selectedTable?.tableNumber}
                  </Dialog.Title>

                  {/* QR Code display */}
                  <div className="flex justify-center mb-6">
                    {qrCodeData ? (
                      <img
                        src={qrCodeData}
                        alt={`QR Code bàn ${selectedTable?.tableNumber}`}
                        className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                        <p className="text-gray-500">Đang tải...</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDownloadQRCode}
                      className="flex-1 btn-primary"
                    >
                      Tải xuống
                    </button>
                    <button
                      onClick={() => setIsQRDialogOpen(false)}
                      className="flex-1 btn-secondary"
                    >
                      Đóng
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </AdminLayout>
  );
};

export default TablesPage;