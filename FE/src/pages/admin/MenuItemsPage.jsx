import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import MenuItemModal from '../../components/admin/MenuItemModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageWithFallback from '../../components/common/ImageWithFallback'; // ✅ IMPORT
import menuItemApi from '../../api/menuItemApi';
import categoryApi from '../../api/categoryApi';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const MenuItemsPage = () => {
  const { user } = useAuth();

  // State
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterAvailable, setFilterAvailable] = useState('all');
  const [filterFeatured, setFilterFeatured] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch categories
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

  // Fetch menu items
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const params = {
        restaurantId: user?.restaurantId,
        sort: 'displayOrder',
        order: 'ASC',
      };

      if (selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }

      if (filterAvailable !== 'all') {
        params.isAvailable = filterAvailable === 'available';
      }

      if (filterFeatured !== 'all') {
        params.isFeatured = filterFeatured === 'featured';
      }

      const response = await menuItemApi.getAll(params);
      setMenuItems(response.data.menuItems || []);
    } catch (error) {
      console.error('Fetch menu items error:', error);
      toast.error('Không thể tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.restaurantId) {
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchMenuItems();
    }
  }, [user, selectedCategory, filterAvailable, filterFeatured]);

  // Filtered menu items based on search
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle create/edit
  const handleOpenModal = (menuItem = null) => {
    setSelectedMenuItem(menuItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMenuItem(null);
  };

  const handleSubmit = async (data) => {
    try {
      setModalLoading(true);

      const menuItemData = {
        ...data,
        restaurantId: user.restaurantId,
      };

      if (selectedMenuItem) {
        await menuItemApi.update(selectedMenuItem.id, menuItemData);
        toast.success('Cập nhật món ăn thành công');
      } else {
        await menuItemApi.create(menuItemData);
        toast.success('Tạo món ăn thành công');
      }

      handleCloseModal();
      fetchMenuItems();
    } catch (error) {
      console.error('Submit menu item error:', error);
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleOpenDeleteDialog = (menuItem) => {
    setSelectedMenuItem(menuItem);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedMenuItem(null);
  };

  const handleDelete = async () => {
    try {
      setModalLoading(true);
      await menuItemApi.delete(selectedMenuItem.id);
      toast.success('Xóa món ăn thành công');
      handleCloseDeleteDialog();
      fetchMenuItems();
    } catch (error) {
      console.error('Delete menu item error:', error);
      const message = error.response?.data?.message || 'Không thể xóa món ăn';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle toggle availability
  const handleToggleAvailability = async (menuItem) => {
    try {
      await menuItemApi.toggleAvailability(menuItem.id);
      toast.success(
        `${menuItem.isAvailable ? 'Ẩn' : 'Hiện'} món ăn thành công`
      );
      fetchMenuItems();
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  // Handle toggle featured
  const handleToggleFeatured = async (menuItem) => {
    try {
      await menuItemApi.toggleFeatured(menuItem.id);
      toast.success(
        `${menuItem.isFeatured ? 'Bỏ' : 'Đánh dấu'} món nổi bật thành công`
      );
      fetchMenuItems();
    } catch (error) {
      console.error('Toggle featured error:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <AdminLayout title="Quản lý Món ăn">
      {/* Header Actions */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-4">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm món ăn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center lg:justify-start"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Thêm món ăn
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field flex-1 min-w-[150px]"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={filterAvailable}
            onChange={(e) => setFilterAvailable(e.target.value)}
            className="input-field flex-1 min-w-[150px]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Còn món</option>
            <option value="unavailable">Hết món</option>
          </select>

          <select
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value)}
            className="input-field flex-1 min-w-[150px]"
          >
            <option value="all">Tất cả món</option>
            <option value="featured">Món nổi bật</option>
            <option value="normal">Món thường</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Tổng món</p>
          <p className="text-2xl font-bold text-gray-900">{menuItems.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Còn món</p>
          <p className="text-2xl font-bold text-green-600">
            {menuItems.filter((item) => item.isAvailable).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Hết món</p>
          <p className="text-2xl font-bold text-red-600">
            {menuItems.filter((item) => !item.isAvailable).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Nổi bật</p>
          <p className="text-2xl font-bold text-yellow-600">
            {menuItems.filter((item) => item.isFeatured).length}
          </p>
        </div>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {searchTerm
              ? 'Không tìm thấy món ăn nào'
              : 'Chưa có món ăn nào. Hãy tạo món ăn đầu tiên!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className="card hover:shadow-lg transition-shadow relative"
            >
              {/* Featured badge */}
              {item.isFeatured && (
                <div className="absolute top-2 right-2 z-10">
                  <StarIconSolid className="h-6 w-6 text-yellow-500" />
                </div>
              )}

              {/* ✅ IMAGE WITH FALLBACK */}
              <div className="mb-3">
                <ImageWithFallback
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                  aspectRatio="square"
                  fallbackText="Chưa có ảnh"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                {/* Category */}
                {item.category && (
                  <p className="text-xs text-gray-500 mb-1">
                    {item.category.name}
                  </p>
                )}

                {/* Name */}
                <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">
                  {item.name}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.isVegetarian && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                      Chay
                    </span>
                  )}
                  {item.isSpicy && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                      Cay
                    </span>
                  )}
                  {item.preparationTime && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {item.preparationTime} phút
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-3">
                  {item.discountPrice ? (
                    <div>
                      <span className="text-sm text-gray-500 line-through mr-2">
                        {formatCurrency(item.price)}
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(item.discountPrice)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(item.price)}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.isAvailable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.isAvailable ? 'Còn món' : 'Hết món'}
                  </span>
                  <button
                    onClick={() => handleToggleFeatured(item)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title={item.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                  >
                    {item.isFeatured ? (
                      <StarIconSolid className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className="flex-1 btn-secondary text-xs"
                >
                  {item.isAvailable ? 'Hết món' : 'Còn món'}
                </button>
                <button
                  onClick={() => handleOpenModal(item)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Chỉnh sửa"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleOpenDeleteDialog(item)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <MenuItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        menuItem={selectedMenuItem}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Xóa món ăn?"
        message={`Bạn có chắc chắn muốn xóa món "${selectedMenuItem?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        loading={modalLoading}
      />
    </AdminLayout>
  );
};

export default MenuItemsPage;