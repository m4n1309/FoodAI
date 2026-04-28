import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import AdminLayout from '../../components/admin/AdminLayout';
import ComboModal from '../../components/admin/ComboModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageWithFallback from '../../components/common/ImageWithFallback';
import comboApi from '../../services/comboService.js';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const CombosPage = () => {
  const { user } = useAuth();

  // State
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAvailable, setFilterAvailable] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch combos
  const fetchCombos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        restaurantId: user?.restaurantId,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (filterAvailable !== 'all') {
        params.isAvailable = filterAvailable === 'available';
      }

      const response = await comboApi.getAll(params);
      setCombos(response.data || []);
    } catch (error) {
      console.error('Fetch combos error:', error);
      toast.error('Không thể tải danh sách combo');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, searchTerm, filterAvailable]);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchCombos();
    }
  }, [user?.restaurantId, fetchCombos]);

  // Handle create/edit
  const handleOpenModal = (combo = null) => {
    setSelectedCombo(combo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCombo(null);
  };

  const handleSubmit = async (data) => {
    try {
      setModalLoading(true);

      const comboData = {
        ...data,
        restaurantId: user.restaurantId,
      };

      if (selectedCombo) {
        await comboApi.update(selectedCombo.id, comboData);
        toast.success('Cập nhật combo thành công');
      } else {
        await comboApi.create(comboData);
        toast.success('Tạo combo thành công');
      }

      handleCloseModal();
      fetchCombos();
    } catch (error) {
      console.error('Submit combo error:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleOpenDeleteDialog = (combo) => {
    setSelectedCombo(combo);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCombo(null);
  };

  const handleDelete = async () => {
    try {
      setModalLoading(true);
      await comboApi.delete(selectedCombo.id);
      toast.success('Xóa combo thành công');
      handleCloseDeleteDialog();
      fetchCombos();
    } catch (error) {
      console.error('Delete combo error:', error);
      const message = error.response?.data?.message || 'Không thể xóa combo';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleAvailability = async (combo) => {
    try {
      await comboApi.toggleAvailability(combo.id);
      toast.success(
        `${combo.isAvailable ? 'Ẩn' : 'Hiện'} combo thành công`
      );
      fetchCombos();
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <AdminLayout title="Quản lý Combo">
      {/* Header Actions */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-lg relative">
          <input
            type="text"
            placeholder="Tìm kiếm combo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterAvailable}
            onChange={(e) => setFilterAvailable(e.target.value)}
            className="input-field min-w-[150px]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Đang bán</option>
            <option value="unavailable">Tạm dừng</option>
          </select>
          
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Thêm Combo
          </button>
        </div>
      </div>

      {/* Combos Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : combos.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex flex-col items-center">
             <InformationCircleIcon className="h-12 w-12 text-gray-300 mb-4" />
             <p className="text-gray-500">
               {searchTerm
                 ? 'Không tìm thấy combo nào khớp với tìm kiếm'
                 : 'Chưa có combo nào. Hãy tạo combo đầu tiên để tăng doanh thu!'}
             </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="card hover:shadow-lg transition-all border-l-4 border-l-primary-500 overflow-hidden"
            >
              <div className="flex gap-4">
                <div className="w-24 h-24 flex-shrink-0">
                  <ImageWithFallback
                    src={combo.imageUrl}
                    alt={combo.name}
                    className="w-full h-full object-cover rounded-lg"
                    fallbackText="Combo"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{combo.name}</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    {combo.discountPrice ? (
                      <>
                        <span className="text-lg font-bold text-red-600">{formatCurrency(combo.discountPrice)}</span>
                        <span className="text-sm text-gray-400 line-through">{formatCurrency(combo.price)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(combo.price)}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center text-xs text-gray-500 bg-blue-50 w-fit px-2 py-1 rounded-md">
                    <InformationCircleIcon className="h-3.5 w-3.5 mr-1 text-primary-500" />
                    <span>Gồm {combo.items?.length || 0} món ăn</span>
                  </div>
                </div>
              </div>

              {/* Items List Snippet */}
              <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Trong Combo này:</p>
                <div className="space-y-1.5">
                  {(combo.items || []).slice(0, 3).map(it => (
                    <div key={it.id} className="text-xs text-gray-700 flex justify-between bg-white/60 p-1.5 rounded-md">
                      <span className="truncate mr-2 font-medium"> {it.menuItem?.name || 'Món ăn'}</span>
                      <span className="text-primary-600 font-bold">x{it.quantity}</span>
                    </div>
                  ))}
                  {(combo.items?.length || 0) > 3 && (
                    <p className="text-[10px] text-center text-gray-400 italic mt-2">...và {(combo.items?.length || 0) - 3} món khác</p>
                  )}
                  {(combo.items?.length || 0) === 0 && (
                     <p className="text-[10px] text-center text-gray-400 italic">Chưa có món ăn nào</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                  combo.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {combo.isAvailable ? 'Đang bán' : 'Tạm dừng'}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleAvailability(combo)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title={combo.isAvailable ? 'Ẩn khỏi menu' : 'Hiện trên menu'}
                  >
                     <InformationCircleIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleOpenModal(combo)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteDialog(combo)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ComboModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        combo={selectedCombo}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Xóa Combo?"
        message={`Bạn có chắc chắn muốn xóa combo "${selectedCombo?.name}"? Hành động này không thể hoàn tác và sẽ xóa tất cả thiết lập món ăn bên trong.`}
        confirmText="Xóa ngay"
        loading={modalLoading}
      />
    </AdminLayout>
  );
};

export default CombosPage;
