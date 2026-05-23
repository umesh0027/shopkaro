





import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUpload, FiX, FiToggleLeft, FiToggleRight, FiChevronDown, FiChevronRight, FiTag } from 'react-icons/fi';
import { categoryAPI } from '../../services/api';
import { ALL_SIZE_TYPES, getSizeLabel } from '../../utils/SizeConfig';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const sizeTypeColors = {
  none:       'bg-gray-100 text-gray-500',
  clothing:   'bg-blue-50 text-blue-600',
  bottomwear: 'bg-amber-50 text-amber-600',
  footwear:   'bg-green-50 text-green-600',
  custom:     'bg-purple-50 text-purple-600',
};

const EMPTY_FORM = { name: '', description: '', sizeType: 'none', parentId: '', customSizesInput: '' };

const Categories = () => {
  const [tree, setTree]       = useState([]); // nested [{...parent, subCategories:[]}]
  const [flatList, setFlatList] = useState([]); // all cats flat for dropdowns
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving]   = useState(false);
  const [expandedParents, setExpandedParents] = useState({});

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await categoryAPI.getAll();
      setTree(data.categories || []);
      setFlatList(data.flat || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cat) => {
    setForm({
      name: cat.name,
      description: cat.description || '',
      sizeType: cat.sizeType || 'none',
      parentId: cat.parent?._id || cat.parent || '',
      customSizesInput: (cat.customSizes || []).join(', ')
    });
    setImagePreview(cat.image?.url || '');
    setEditingId(cat._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('sizeType', form.sizeType);
      if (form.parentId) fd.append('parentId', form.parentId);
      if (form.sizeType === 'custom') {
        const arr = form.customSizesInput.split(',').map(s => s.trim()).filter(Boolean);
        fd.append('customSizes', JSON.stringify(arr));
      }
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await categoryAPI.update(editingId, fd);
        toast.success('Category updated!');
      } else {
        await categoryAPI.create(fd);
        toast.success('Category created!');
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await categoryAPI.delete(id);
      toast.success('Deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete');
    }
  };

  const handleToggle = async (id) => {
    try {
      await categoryAPI.toggle(id);
      fetchCategories();
    } catch { toast.error('Failed'); }
  };

  const toggleExpand = (id) => setExpandedParents(p => ({ ...p, [id]: !p[id] }));

  const syncCounts = async () => {
  try {
    await categoryAPI.syncCounts(); // ek baar call
    toast.success('Product counts synced!');
    fetchCategories();
  } catch {
    toast.error('Sync failed');
  }
};


  /* ── Category Card ── */
  const CategoryCard = ({ cat, isChild = false }) => (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-colors ${!cat.isActive ? 'border-gray-100 opacity-70' : 'border-transparent'} ${isChild ? 'ml-6 border-l-4 border-l-primary-100' : ''}`}>

      <div className={`h-28 bg-gray-50 overflow-hidden relative ${isChild ? 'h-20' : ''}`}>
        {cat.image?.url
          ? <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl">
              {cat.level === 0 ? '🗂️' : '🏷️'}
            </div>
        }
        {cat.level === 1 && (
          <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            Sub
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
          <span className={`badge text-xs ml-1 shrink-0 ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {cat.isActive ? 'Active' : 'Off'}
          </span>
        </div>

        {cat.description && (
          <p className="text-xs text-gray-400 mb-1.5 line-clamp-1">{cat.description}</p>
        )}

        {/* Size type badge */}
        {cat.sizeType && cat.sizeType !== 'none' && (
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${sizeTypeColors[cat.sizeType]}`}>
            <FiTag size={10}/>
            {getSizeLabel(cat.sizeType).split('(')[0].trim()}
          </div>
        )}

        <p className="text-xs text-gray-400 mb-2">{cat.productCount || 0} products</p>

        <div className="flex gap-1.5">
          <button onClick={() => handleEdit(cat)}
            className="flex-1 btn-secondary py-1.5 text-xs flex items-center justify-center gap-1">
            <FiEdit2 size={11}/> Edit
          </button>
          <button onClick={() => handleToggle(cat._id)}
            className={`p-1.5 rounded-xl transition-colors ${cat.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
            {cat.isActive ? <FiToggleRight size={18}/> : <FiToggleLeft size={18}/>}
          </button>
          <button onClick={() => handleDelete(cat._id, cat.name)}
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
            <FiTrash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6">

            {/* // Header mein "Add Category" button ke saath:
            // sirf ek baar "Sync Counts" button dabao — uske baad future mein create/update/delete sab automatic handle ho jayega, dobara press karne ki zarurat nahi. */}
<button onClick={syncCounts}
  className="btn-secondary flex items-center gap-2 text-sm py-2.5 px-4">
  Sync Counts
</button>


      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{flatList.length} total · {tree.length} parent categories</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5">
          <FiPlus size={16}/> Add Category
        </button>
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 animate-slide-down border-2 border-primary-100">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-semibold text-gray-900 text-lg">
              {editingId ? 'Edit Category' : 'New Category'}
            </h2>
            <button onClick={resetForm} className="p-1.5 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-5">
            {/* Left column */}
            <div className="space-y-4">
              {/* Parent selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, parentId: '' }))}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${!form.parentId ? 'bg-gradient-to-br from-pink-400 to-yellow-500 text-white border-accent-400' : 'bg-white text-gray-600 border-gray-200 hover:border-accent-400'}`}>
                    🗂️ Parent Category
                  </button>
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, parentId: flatList.find(c => c.level === 0)?._id || '' }))}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${form.parentId ? 'bg-gradient-to-br from-pink-400 to-yellow-500 text-white border-accent-400' : 'bg-white text-gray-600 border-gray-200 hover:border-accent-400'}`}>
                    🏷️ Sub-Category
                  </button>
                </div>

                {/* Parent dropdown (shown only for sub-category) */}
                {form.parentId !== undefined && form.parentId !== '' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Parent Category *
                    </label>
                    <select required={!!form.parentId} value={form.parentId}
                      onChange={e => setForm(p => ({ ...p, parentId: e.target.value }))}
                      className="input-field text-sm py-2">
                      <option value="">Select parent...</option>
                      {flatList.filter(c => c.level === 0).map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      e.g. "Jeans" is sub-category of "Men's Fashion"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
                    Top-level category — e.g. "Men's Fashion", "Electronics", "Footwear"
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category Name *</label>
                <input required value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={form.parentId ? 'e.g. Jeans, T-Shirts, Sneakers' : "e.g. Men's Fashion, Electronics"}
                  className="input-field"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea rows={2} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description..." className="input-field resize-none text-sm"/>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Size Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size Type for Products
                  {!form.parentId && <span className="text-gray-400 font-normal ml-1">(usually set on sub-categories)</span>}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_SIZE_TYPES.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(p => ({ ...p, sizeType: opt.value }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${form.sizeType === opt.value ? 'bg-gradient-to-br from-pink-400 to-yellow-500 text-white border-accent-600' : 'bg-white text-gray-600 border-gray-200 hover:border-accent-400'}`}>
                      <span className="text-base">{opt.icon}</span>
                      <span className="text-center leading-tight">{opt.label.split(' (')[0]}</span>
                      {opt.sizes.length > 0 && (
                        <span className={`text-xs ${form.sizeType === opt.value ? 'text-primary-100' : 'text-gray-400'}`}>
                          {opt.sizes.slice(0, 3).join(' · ')}
                          {opt.sizes.length > 3 ? '...' : ''}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Size preview chips */}
                {form.sizeType !== 'none' && form.sizeType !== 'custom' && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_SIZE_TYPES.find(t => t.value === form.sizeType)?.sizes.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold border border-primary-100">{s}</span>
                    ))}
                  </div>
                )}

                {/* Custom sizes */}
                {form.sizeType === 'custom' && (
                  <div className="mt-2">
                    <input value={form.customSizesInput}
                      onChange={e => setForm(p => ({ ...p, customSizesInput: e.target.value }))}
                      placeholder='e.g. 13", 15", 17"  or  Free Size, Regular, Oversized'
                      className="input-field text-sm py-2 mt-1"/>
                    {form.customSizesInput && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.customSizesInput.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Image</label>
                <label className="block border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-accent-400 hover:bg-accent-500/20 transition-colors overflow-hidden">
                  {imagePreview ? (
                    <div className="relative h-28">
                      <img src={imagePreview} alt="" className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium">Change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 flex flex-col items-center justify-center gap-1.5">
                      <FiUpload size={20} className="text-gray-400"/>
                      <p className="text-sm text-gray-500">Upload image</p>
                      <p className='text-sm text-red-400'>Maximum file size allowed is 5MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden"/>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary py-2.5 px-8">
                {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary py-2.5 px-6">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category Tree ── */}
      {loading ? <LoadingSpinner/> : tree.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗂️</p>
          <p>No categories yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tree.map(parent => (
            <div key={parent._id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              {/* Parent header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpand(parent._id)}
                    className="p-1 rounded-lg hover:bg-gray-200 transition-colors">
                    {expandedParents[parent._id] === false
                      ? <FiChevronRight size={16} className="text-gray-500"/>
                      : <FiChevronDown size={16} className="text-gray-500"/>
                    }
                  </button>
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100">
                    {parent.image?.url
                      ? <img src={parent.image.url} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-lg">🗂️</div>
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-bold text-gray-900">{parent.name}</h2>
                      <span className={`badge text-xs ${parent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {parent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {parent.subCategories?.length || 0} sub-categories
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Add sub-category shortcut */}
                  <button
                    onClick={() => {
                      setForm({ ...EMPTY_FORM, parentId: parent._id });
                      setShowForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-200 transition-colors font-medium">
                    <FiPlus size={12}/> Add Sub
                  </button>
                  <button onClick={() => handleEdit(parent)} className="p-1.5 text-gray-500 hover:bg-white hover:text-primary-600 rounded-xl transition-colors">
                    <FiEdit2 size={15}/>
                  </button>
                  <button onClick={() => handleToggle(parent._id)} className={`p-1.5 rounded-xl transition-colors ${parent.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}>
                    {parent.isActive ? <FiToggleRight size={20}/> : <FiToggleLeft size={20}/>}
                  </button>
                  <button onClick={() => handleDelete(parent._id, parent.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                    <FiTrash2 size={14}/>
                  </button>
                </div>
              </div>

              {/* Sub-categories grid */}
              {expandedParents[parent._id] !== false && (
                <>
                  {parent.subCategories?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {parent.subCategories.map(child => (
                        <CategoryCard key={child._id} cat={child} isChild/>
                      ))}
                      {/* Add sub-category card */}
                      <button
                        onClick={() => {
                          setForm({ ...EMPTY_FORM, parentId: parent._id });
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 hover:border-primary-300 hover:bg-white transition-colors min-h-36 text-gray-400 hover:text-primary-600 group">
                        <FiPlus size={22} className="mb-1.5 group-hover:scale-110 transition-transform"/>
                        <span className="text-xs font-medium">Add Sub-Category</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
                      <p className="text-sm text-gray-400 mb-3">No sub-categories yet</p>
                      <button
                        onClick={() => {
                          setForm({ ...EMPTY_FORM, parentId: parent._id });
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-1.5 mx-auto">
                        <FiPlus size={14}/> Add first sub-category
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
