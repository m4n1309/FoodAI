import db from '../models/index.js';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} from '../utils/ResponseHelper.js';
import { StatusCodes } from 'http-status-codes';


const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET ALL CATEGORIES
// GET /categories?restaurantId=1&isActive=true&sort=displayOrder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getAllCategories = async (req, res) => {
  try {
    const { 
      restaurantId, 
      isActive, 
      sort = 'displayOrder',
      order = 'ASC'
    } = req.query;

    console.log('📋 Get all categories');
    console.log('   Restaurant ID:', restaurantId);
    console.log('   Active filter:', isActive);

    // Build where clause
    const where = {};
    
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // ✅ SỬA: Query categories (bỏ literal field)
    const categories = await db.Category.findAll({
      where,
      order: [[sort, order.toUpperCase()]],
      // ✅ KHÔNG dùng attributes.include với literal
      // Sẽ tính itemCount bằng cách khác
    });

    // ✅ Tính itemCount cho mỗi category sau khi query
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const itemCount = await db.MenuItem.count({
          where: {
            categoryId: category.id,
            isAvailable: true
          }
        });

        // Convert Sequelize instance to plain object
        const categoryData = category.toJSON();
        categoryData.itemCount = itemCount;
        
        return categoryData;
      })
    );

    console.log(`✅ Found ${categoriesWithCount.length} categories`);

    return successResponse(res, {
      total: categoriesWithCount.length,
      categories: categoriesWithCount
    }, 'Lấy danh sách danh mục thành công');

  } catch (error) {
    console.error('❌ Get categories error:', error);
    return errorResponse(res, error.message || 'Lấy danh sách thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET CATEGORY BY ID
// GET /categories/:id
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Get category by ID:', id);

    const category = await db.Category.findByPk(id, {
      include: [{
        model: db.MenuItem,
        as: 'menuItems',
        where: { isAvailable: true },
        required: false,
        attributes: ['id', 'name', 'slug', 'price', 'imageUrl', 'isAvailable']
      }]
    });

    if (!category) {
      return notFoundResponse(res, 'Danh mục không tồn tại');
    }

    console.log('✅ Category found:', category.name);

    // Convert to JSON để thêm computed field
    const categoryData = category.toJSON();
    categoryData.itemCount = categoryData.menuItems ? categoryData.menuItems.length : 0;

    return successResponse(res, categoryData, 'Lấy thông tin danh mục thành công');

  } catch (error) {
    console.error('❌ Get category error:', error);
    return errorResponse(res, error.message || 'Lấy thông tin thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE CATEGORY
// POST /categories
// Body: { restaurantId, name, description, imageUrl }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createCategory = async (req, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('➕ CREATE CATEGORY REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Request Body:', req.body);
    console.log('Staff Info:', {
      id: req.staff?.id,
      username: req.staff?.username,
      restaurantId: req.staff?.restaurantId,
      role: req.staff?.role
    });

    const { restaurantId, name, description, imageUrl } = req.body;

    console.log('Extracted data:', { restaurantId, name, description, imageUrl });

    // Validate required fields
    if (!restaurantId || !name) {
      console.log('❌ Validation failed: Missing restaurantId or name');
      return forbiddenResponse(res, 'Restaurant ID và tên danh mục là bắt buộc');
    }

    console.log('✅ Validation passed');

    // Check permission: staff must belong to this restaurant
    console.log('Checking permission...');
    console.log('   Staff restaurantId:', req.staff.restaurantId);
    console.log('   Request restaurantId:', parseInt(restaurantId));

    if (req.staff.restaurantId !== parseInt(restaurantId)) {
      console.log('❌ Permission denied: Restaurant ID mismatch');
      return forbiddenResponse(res, 'Bạn không có quyền tạo danh mục cho nhà hàng này');
    }

    console.log('✅ Permission check passed');

    // Generate slug
    const slug = generateSlug(name);
    console.log('Generated slug:', slug);

    // Check duplicate name in same restaurant
    console.log('Checking duplicate category name...');
    const existingCategory = await db.Category.findOne({
      where: {
        restaurantId,
        name
      }
    });

    if (existingCategory) {
      console.log('❌ Duplicate name found:', existingCategory.id);
      return forbiddenResponse(res, 'Tên danh mục đã tồn tại');
    }

    console.log('✅ No duplicate found');

    // Get max display order
    console.log('Getting max display order...');
    const maxOrder = await db.Category.max('displayOrder', {
      where: { restaurantId }
    });
    console.log('Max display order:', maxOrder);

    const newDisplayOrder = (maxOrder || 0) + 1;
    console.log('New display order:', newDisplayOrder);

    // Create category
    console.log('Creating category...');
    const category = await db.Category.create({
      restaurantId,
      name,
      slug,
      description,
      imageUrl,
      displayOrder: newDisplayOrder
    });

    console.log('✅ Category created successfully:', category.id);
    console.log('Category data:', category.toJSON());

    return successResponse(res, category, 'Tạo danh mục thành công', StatusCodes.CREATED);

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ CREATE CATEGORY ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.name === 'SequelizeValidationError') {
      return forbiddenResponse(res, error.errors.map(e => e.message).join(', '));
    }
    
    return errorResponse(res, error.message || 'Tạo danh mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE CATEGORY
// PUT /categories/:id
// Body: { name, description, imageUrl }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl } = req.body;

    console.log('✏️ Update category:', id);

    // Find category
    const category = await db.Category.findByPk(id);

    if (!category) {
      return notFoundResponse(res, 'Danh mục không tồn tại');
    }

    // Check permission
    if (req.staff.restaurantId !== category.restaurantId) {
      return forbiddenResponse(res, 'Bạn không có quyền sửa danh mục này');
    }

    // Check duplicate name if name changed
    if (name && name !== category.name) {
      const existingCategory = await db.Category.findOne({
        where: {
          restaurantId: category.restaurantId,
          name,
          id: { [db.Sequelize.Op.ne]: id }
        }
      });

      if (existingCategory) {
        return forbiddenResponse(res, 'Tên danh mục đã tồn tại trong nhà hàng này');
      }
    }

    // Update category
    const updateData = {};
    
    if (name) {
      updateData.name = name;
      updateData.slug = generateSlug(name);
    }
    
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    await category.update(updateData);

    console.log('✅ Category updated:', category.name);

    return successResponse(res, category, 'Cập nhật danh mục thành công');

  } catch (error) {
    console.error('❌ Update category error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return errorResponse(res, error.errors.map(e => e.message).join(', '), StatusCodes.BAD_REQUEST);
    }
    
    return errorResponse(res, error.message || 'Cập nhật danh mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE CATEGORY
// DELETE /categories/:id
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Delete category:', id);

    const category = await db.Category.findByPk(id);

    if (!category) {
      return notFoundResponse(res, 'Danh mục không tồn tại');
    }

    // Check permission
    if (req.staff.restaurantId !== category.restaurantId) {
      return forbiddenResponse(res, 'Bạn không có quyền xóa danh mục này');
    }

    // Check if category has menu items
    const itemCount = await db.MenuItem.count({
      where: { categoryId: id }
    });

    if (itemCount > 0) {
      return forbiddenResponse(res, `Không thể xóa danh mục có ${itemCount} món ăn. Vui lòng xóa hoặc chuyển món ăn sang danh mục khác trước.`);
    }

    // Delete category
    await category.destroy();

    console.log('✅ Category deleted');

    return successResponse(res, null, 'Xóa danh mục thành công');

  } catch (error) {
    console.error('❌ Delete category error:', error);
    return errorResponse(res, error.message || 'Xóa danh mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOGGLE ACTIVE STATUS
// PATCH /categories/:id/toggle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 Toggle category status:', id);

    const category = await db.Category.findByPk(id);

    if (!category) {
      return notFoundResponse(res, 'Danh mục không tồn tại');
    }

    // Check permission
    if (req.staff.restaurantId !== category.restaurantId) {
      return forbiddenResponse(res, 'Bạn không có quyền thay đổi trạng thái danh mục này');
    }

    // Toggle status
    await category.update({
      isActive: !category.isActive
    });

    console.log(`✅ Category status changed to: ${category.isActive ? 'Active' : 'Inactive'}`);

    return successResponse(res, category, 'Thay đổi trạng thái thành công');

  } catch (error) {
    console.error('❌ Toggle category error:', error);
    return errorResponse(res, error.message || 'Thay đổi trạng thái thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REORDER CATEGORIES
// PATCH /categories/reorder
// Body: { categoryIds: [3, 1, 2] }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const reorderCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body;

    console.log('🔢 Reorder categories:', categoryIds);

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return forbiddenResponse(res, 'categoryIds phải là mảng không rỗng');
    }

    // Verify all categories belong to staff's restaurant
    const categories = await db.Category.findAll({
      where: {
        id: categoryIds,
        restaurantId: req.staff.restaurantId
      }
    });

    if (categories.length !== categoryIds.length) {
      return forbiddenResponse(res, 'Một số danh mục không tồn tại hoặc không thuộc nhà hàng của bạn');
    }

    // Update display order
    const updatePromises = categoryIds.map((categoryId, index) => {
      return db.Category.update(
        { displayOrder: index + 1 },
        { where: { id: categoryId } }
      );
    });

    await Promise.all(updatePromises);

    console.log('✅ Categories reordered');

    return successResponse(res, null, 'Sắp xếp danh mục thành công');

  } catch (error) {
    console.error('❌ Reorder categories error:', error);
    return errorResponse(res, error.message || 'Sắp xếp danh mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━���━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories
};