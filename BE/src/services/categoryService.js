import db from '../models/index.js';
import { Op } from 'sequelize';
import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './serviceError.js';

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

const ensureStaffRestaurantAccess = (staffRestaurantId, targetRestaurantId, message) => {
  if (String(staffRestaurantId) !== String(targetRestaurantId)) {
    throw new ServiceError(message, StatusCodes.FORBIDDEN);
  }
};

const getAllCategories = async ({
  restaurantId,
  isActive,
  search,
  sort = 'displayOrder',
  order = 'ASC',
  page = 1,
  limit = 6
}) => {
  const where = {};

  if (restaurantId) where.restaurantId = restaurantId;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.name = {
      [Op.iLike]: `%${String(search).trim()}%`
    };
  }

  const numericPage = Math.max(parseInt(page, 10) || 1, 1);
  const numericLimit = Math.max(parseInt(limit, 10) || 6, 1);
  const offset = (numericPage - 1) * numericLimit;

  const { count, rows: categories } = await db.Category.findAndCountAll({
    where,
    order: [[sort, String(order).toUpperCase()]],
    limit: numericLimit,
    offset
  });

  const categoriesWithCount = await Promise.all(
    categories.map(async (category) => {
      const itemCount = await db.MenuItem.count({
        where: {
          categoryId: category.id,
          isAvailable: true
        }
      });

      const data = category.toJSON();
      data.itemCount = itemCount;
      return data;
    })
  );

  return {
    total: count,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(count / numericLimit),
    categories: categoriesWithCount
  };
};

const getCategoryById = async (id) => {
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
    throw new ServiceError('Danh mục không tồn tại', StatusCodes.NOT_FOUND);
  }

  const data = category.toJSON();
  data.itemCount = data.menuItems ? data.menuItems.length : 0;

  return data;
};

const createCategory = async ({ body, staff }) => {
  const { restaurantId, name, description, imageUrl } = body;

  if (!restaurantId || !name) {
    throw new ServiceError('Restaurant ID và tên danh mục là bắt buộc', StatusCodes.BAD_REQUEST);
  }

  ensureStaffRestaurantAccess(
    staff.restaurantId,
    parseInt(restaurantId, 10),
    'Bạn không có quyền tạo danh mục cho nhà hàng này'
  );

  const existingCategory = await db.Category.findOne({
    where: {
      restaurantId,
      name
    }
  });

  if (existingCategory) {
    throw new ServiceError('Tên danh mục đã tồn tại', StatusCodes.CONFLICT);
  }

  const maxOrder = await db.Category.max('displayOrder', {
    where: { restaurantId }
  });

  return db.Category.create({
    restaurantId,
    name,
    slug: generateSlug(name),
    description,
    imageUrl,
    displayOrder: (maxOrder || 0) + 1
  });
};

const updateCategory = async ({ id, body, staffRestaurantId }) => {
  const { name, description, imageUrl } = body;

  const category = await db.Category.findByPk(id);
  if (!category) {
    throw new ServiceError('Danh mục không tồn tại', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    category.restaurantId,
    'Bạn không có quyền sửa danh mục này'
  );

  if (name && name !== category.name) {
    const existingCategory = await db.Category.findOne({
      where: {
        restaurantId: category.restaurantId,
        name,
        id: { [Op.ne]: id }
      }
    });

    if (existingCategory) {
      throw new ServiceError('Tên danh mục đã tồn tại trong nhà hàng này', StatusCodes.CONFLICT);
    }
  }

  const updateData = {};
  if (name) {
    updateData.name = name;
    updateData.slug = generateSlug(name);
  }
  if (description !== undefined) updateData.description = description;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

  await category.update(updateData);
  return category;
};

const deleteCategory = async ({ id, staffRestaurantId }) => {
  const category = await db.Category.findByPk(id);
  if (!category) {
    throw new ServiceError('Danh mục không tồn tại', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    category.restaurantId,
    'Bạn không có quyền xóa danh mục này'
  );

  const itemCount = await db.MenuItem.count({
    where: { categoryId: id }
  });

  if (itemCount > 0) {
    throw new ServiceError(
      `Không thể xóa danh mục có ${itemCount} món ăn. Vui lòng xóa hoặc chuyển món ăn sang danh mục khác trước.`,
      StatusCodes.CONFLICT
    );
  }

  await category.destroy();
};

const toggleCategoryStatus = async ({ id, staffRestaurantId }) => {
  const category = await db.Category.findByPk(id);
  if (!category) {
    throw new ServiceError('Danh mục không tồn tại', StatusCodes.NOT_FOUND);
  }

  ensureStaffRestaurantAccess(
    staffRestaurantId,
    category.restaurantId,
    'Bạn không có quyền thay đổi trạng thái danh mục này'
  );

  await category.update({
    isActive: !category.isActive
  });

  return category;
};

const reorderCategories = async ({ categoryIds, staffRestaurantId }) => {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw new ServiceError('categoryIds phải là mảng không rỗng', StatusCodes.BAD_REQUEST);
  }

  const categories = await db.Category.findAll({
    where: {
      id: categoryIds,
      restaurantId: staffRestaurantId
    }
  });

  if (categories.length !== categoryIds.length) {
    throw new ServiceError('Một số danh mục không tồn tại hoặc không thuộc nhà hàng của bạn', StatusCodes.FORBIDDEN);
  }

  const updatePromises = categoryIds.map((categoryId, index) => {
    return db.Category.update(
      { displayOrder: index + 1 },
      { where: { id: categoryId } }
    );
  });

  await Promise.all(updatePromises);
};

export default {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories
};