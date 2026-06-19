import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PromotionModal from '../../components/admin/PromotionModal';
import promotionApi from '../../services/promotionService.js';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';

const PromotionsPage = () => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await promotionApi.getAll({
        page: currentPage,
        limit: pageSize,
      });
      // res is the response body { success: true, message: '...', data: { total, page, limit, totalPages, promotions } }
      // So res.data is the paginated object containing promotions
      setPromotions(res.data.promotions || []);
      setTotalItems(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải danh sách Voucher');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchPromotions();
    }
  }, [user?.restaurantId, fetchPromotions]);

  const handleOpenModal = (promo = null) => {
    setSelectedPromotion(promo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPromotion(null);
  };

  const handleSubmit = async (data) => {
    setModalLoading(true);
    try {
      if (selectedPromotion) {
        await promotionApi.update(selectedPromotion.id, data);
        toast.success('Cập nhật Voucher thành công');
      } else {
        await promotionApi.create(data);
        toast.success('Thêm Voucher mới thành công');
      }
      handleCloseModal();
      fetchPromotions();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    setModalLoading(true);
    try {
      await promotionApi.delete(selectedPromotion.id);
      toast.success('Xóa Voucher thành công');
      setIsDeleteDialogOpen(false);
      fetchPromotions();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi khi xóa Voucher');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (promo) => {
    try {
      await promotionApi.update(promo.id, { isActive: !promo.isActive });
      toast.success(promo.isActive ? 'Đã tắt Voucher' : 'Đã bật Voucher');
      fetchPromotions();
    } catch (e) {
      toast.error('Lỗi khi thay đổi trạng thái');
    }
  };

  const isExpired = (dateString) => new Date(dateString) < new Date();

  return (
    <AdminLayout title="Quản lý Khuyến mãi (Vouchers)">
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">Thiết lập các mã Voucher kích cầu cho nhà hàng</p>
        {user?.role !== 'waiter' && (
          <button className="btn-primary flex items-center" onClick={() => handleOpenModal()}>
            <PlusIcon className="h-5 w-5 mr-1" />
            Tạo Voucher
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center h-64 items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : promotions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Chưa có Voucher nào. Hãy tạo mới ngay!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã / Tên</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Giảm giá</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái/Hạn</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Sử dụng</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {user?.role !== 'waiter' && 'Thao tác'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.map((p) => {
                const expired = isExpired(p.validUntil);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{p.code}</div>
                      <div className="text-sm text-gray-600">{p.name}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-primary-600">
                        {p.discountType === 'percentage' ? `${p.discountValue}%` : formatMoney(p.discountValue)}
                      </div>
                      <div className="text-xs text-gray-500">Đơn tối thiểu: {formatMoney(p.minOrderAmount)}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      {expired ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">Đã hết hạn</span>
                      ) : user?.role === 'waiter' ? (
                        <span className={p.isActive ? "bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium" : "bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium"}>
                          {p.isActive ? 'Đang bật' : 'Đang Tắt'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={p.isActive ? "bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium cursor-pointer" : "bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium cursor-pointer"}
                        >
                          {p.isActive ? 'Đang bật' : 'Đang Tắt'}
                        </button>
                      )}
                      <div className="text-xs text-gray-500 mt-1">Đến {new Date(p.validUntil).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-gray-800">{p.usageCount} / {p.usageLimit || '∞'}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user?.role !== 'waiter' && (
                        <>
                          <button onClick={() => handleOpenModal(p)} className="text-primary-600 hover:text-primary-900 mr-3" title="Chỉnh sửa">
                            <PencilIcon className="h-5 w-5 inline" />
                          </button>
                          <button onClick={() => { setSelectedPromotion(p); setIsDeleteDialogOpen(true); }} className="text-red-600 hover:text-red-900" title="Xóa">
                            <TrashIcon className="h-5 w-5 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalItems > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-gray-600">
              Trang {currentPage}/{totalPages} - Tổng {totalItems} Voucher
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="input-field text-xs py-1 px-2 w-20"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      <PromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        promotion={selectedPromotion}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Xóa Voucher"
        message={`Bạn có chắc chắn muốn xóa mã "${selectedPromotion?.code}"? Dữ liệu này sẽ không thể khôi phục.`}
        confirmText="Xóa vĩnh viễn"
        loading={modalLoading}
      />
    </AdminLayout>
  );
};

export default PromotionsPage;
