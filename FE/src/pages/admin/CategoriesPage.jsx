import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import CategoryModal from '../../components/admin/CategoryModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageWithFallback from '../../components/common/ImageWithFallback'; // ✅ IMPORT
import categoryApi from '../../api/categoryApi';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const CategoriesPage = () => {
  const { user } = useAuth();

  // State
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = {
        restaurantId: user?.restaurantId,
        sort: 'displayOrder',
        order: 'ASC',
      };

      if (filterActive !== 'all') {
        params.isActive = filterActive === 'active';
      }

      const response = await categoryApi.getAll(params);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Fetch categories error:', error);
      toast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) {
      fetchCategories();
    }
  }, [user, filterActive]);

  // Filtered categories based on search
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle create/edit
  const handleOpenModal = (category = null) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (data) => {
    try {
      setModalLoading(true);

      const categoryData = {
        ...data,
        restaurantId: user.restaurantId,
      };

      if (selectedCategory) {
        // Update
        await categoryApi.update(selectedCategory.id, categoryData);
        toast.success('Cập nhật danh mục thành công');
      } else {
        // Create
        await categoryApi.create(categoryData);
        toast.success('Tạo danh mục thành công');
      }

      handleCloseModal();
      fetchCategories();
    } catch (error) {
      console.error('Submit category error:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleOpenDeleteDialog = (category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleDelete = async () => {
    try {
      setModalLoading(true);
      await categoryApi.delete(selectedCategory.id);
      toast.success('Xóa danh mục thành công');
      handleCloseDeleteDialog();
      fetchCategories();
    } catch (error) {
      console.error('Delete category error:', error);
      const message = error.response?.data?.message || 'Không thể xóa danh mục';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (category) => {
    try {
      await categoryApi.toggleStatus(category.id);
      toast.success(
        `${category.isActive ? 'Ẩn' : 'Hiện'} danh mục thành công`
      );
      fetchCategories();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  return (
    <AdminLayout title="Quản lý Danh mục">
      {/* Header Actions */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Filter */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="input-field"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã ẩn</option>
            </select>

            {/* Add button */}
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Thêm danh mục
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {searchTerm
              ? 'Không tìm thấy danh mục nào'
              : 'Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="card hover:shadow-lg transition-shadow">
              {/* ✅ SỬA: Image with fallback */}
              <ImageWithFallback
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover rounded-lg"
                aspectRatio="video"
                fallbackText="Chưa có ảnh"
              />

              {/* Info */}
              <div className="flex-1 mt-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      category.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {category.isActive ? 'Hoạt động' : 'Đã ẩn'}
                  </span>
                </div>

                {category.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="text-xs text-gray-500">
                  Thứ tự: #{category.displayOrder}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleStatus(category)}
                  className="flex-1 btn-secondary text-sm"
                >
                  {category.isActive ? 'Ẩn' : 'Hiện'}
                </button>
                <button
                  onClick={() => handleOpenModal(category)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Chỉnh sửa"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleOpenDeleteDialog(category)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        category={selectedCategory}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Xóa danh mục?"
        message={`Bạn có chắc chắn muốn xóa danh mục "${selectedCategory?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        loading={modalLoading}
      />
    </AdminLayout>
  );
};

export default CategoriesPage;