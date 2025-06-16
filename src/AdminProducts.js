// AdminProducts.js
import React, { useState, useEffect } from 'react';

function AdminProducts({ token, onLogout }) {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [newProduct, setNewProduct] = useState({
      title: '',
      description: '',
      price: '',
      product_type: 'TOTEBAG', // Set default value
      available_sizes: '', // New state for available sizes
      images: []
    });
    const [previewImages, setPreviewImages] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [removedImageIds, setRemovedImageIds] = useState([]);
    const [imageColors, setImageColors] = useState({});

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, []);

    // Clean up preview URLs when component unmounts or images change
    useEffect(() => {
        return () => {
            previewImages.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [previewImages]);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/products/', {
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setProducts(data);
            } else {
                setError(data.detail || 'Failed to fetch products.');
            }
        } catch (err) {
            setError('Network error or server unavailable.');
            console.error('Error fetching products:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setNewProduct(prev => ({ ...prev, images: [...prev.images, ...files] }));

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviewImages(prev => [...prev, ...newPreviews]);
    };

    const handleRemovePreviewImage = (indexToRemove) => {
        // If editing an existing product and removing an already uploaded image
        if (editingProduct && previewImages[indexToRemove] && !previewImages[indexToRemove].startsWith('blob:')) {
            const uploadedImage = editingProduct.images.find(img => img.image === previewImages[indexToRemove]);
            if (uploadedImage) {
                setRemovedImageIds(prev => [...prev, uploadedImage.id]);
            }
        }

        // Remove from current previews and corresponding newProduct.images
        setPreviewImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setNewProduct(prev => ({
            ...prev,
            images: prev.images.filter((_, index) => index !== indexToRemove)
        }));

        // Remove the color associated with the removed image
        setImageColors(prev => {
            const newColors = {};
            // Re-index colors after removal
            let newIndex = 0;
            for (let i = 0; i < prev.length; i++) {
                if (i !== indexToRemove) {
                    newColors[newIndex++] = prev[i];
                }
            }
            return newColors;
        });
    };

    const handleImageColorChange = (index, color) => {
        setImageColors(prev => ({
            ...prev,
            [index]: color
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData();
        formData.append('title', newProduct.title);
        formData.append('description', newProduct.description);
        formData.append('price', newProduct.price);
        formData.append('product_type', newProduct.product_type);
        
        // Add available_sizes only if product type is TSHIRT
        if (newProduct.product_type === 'TSHIRT') {
            formData.append('available_sizes', newProduct.available_sizes);
        } else {
            formData.append('available_sizes', ''); // Ensure it's cleared if not TSHIRT
        }


        newProduct.images.forEach(image => {
            formData.append('uploaded_images', image);
        });

        // Append image colors. Ensure that for each uploaded_image, there's a corresponding color or empty string.
        for (let i = 0; i < newProduct.images.length; i++) {
            formData.append('image_colors', imageColors[i] || '');
        }

        // For editing, include removed_images
        if (editingProduct) {
            removedImageIds.forEach(id => {
                formData.append('removed_images', id);
            });
        }

        const url = editingProduct 
            ? `http://localhost:8000/api/products/${editingProduct.id}/` 
            : 'http://localhost:8000/api/products/';
        const method = editingProduct ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Token ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                setNewProduct({
                    title: '',
                    description: '',
                    price: '',
                    product_type: 'TOTEBAG',
                    available_sizes: '', // Reset
                    images: []
                });
                setPreviewImages([]);
                setEditingProduct(null);
                setRemovedImageIds([]);
                setImageColors({});
                fetchProducts();
            } else {
                const errorData = await response.json();
                setError(errorData.detail || JSON.stringify(errorData));
            }
        } catch (err) {
            setError('Network error or server unavailable.');
            console.error('Error submitting product:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setNewProduct({
            title: product.title,
            description: product.description,
            price: product.price,
            product_type: product.product_type,
            available_sizes: product.available_sizes || '', // Load existing sizes
            images: [] // New images will be added separately
        });
        
        // Populate preview images from existing product images
        const existingImagePreviews = product.images.map(img => img.image);
        setPreviewImages(existingImagePreviews);

        // Populate image colors for existing images
        const existingImageColors = {};
        product.images.forEach((img, index) => {
            existingImageColors[index] = img.color || '';
        });
        setImageColors(existingImageColors);
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/products/${productId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });

            if (response.ok) {
                fetchProducts();
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to delete product.');
            }
        } catch (err) {
            setError('Network error or server unavailable.');
            console.error('Error deleting product:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-products">
            <button onClick={onLogout} className="logout-button">Logout</button>
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                    <label htmlFor="title">Title:</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={newProduct.title}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        name="description"
                        value={newProduct.description}
                        onChange={handleInputChange}
                        required
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="price">Price:</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={newProduct.price}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="product_type">Product Type:</label>
                    <select
                        id="product_type"
                        name="product_type"
                        value={newProduct.product_type}
                        onChange={handleInputChange}
                    >
                        <option value="TOTEBAG">Totebag</option>
                        <option value="TSHIRT">T-Shirt</option>
                    </select>
                </div>

                {newProduct.product_type === 'TSHIRT' && (
                    <div className="form-group">
                        <label htmlFor="available_sizes">Available Sizes (comma-separated, e.g., S,M,L,XL):</label>
                        <input
                            type="text"
                            id="available_sizes"
                            name="available_sizes"
                            value={newProduct.available_sizes}
                            onChange={handleInputChange}
                            placeholder="e.g., S,M,L,XL"
                        />
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="images">Product Images:</label>
                    <input
                        type="file"
                        id="images"
                        name="images"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                    <div className="image-previews">
                        {previewImages.map((url, index) => (
                            <div key={index} className="preview-container">
                                <img src={url} alt={`Preview ${index}`} className="preview-thumbnail" />
                                <select
                                    value={imageColors[index] || ''}
                                    onChange={(e) => handleImageColorChange(index, e.target.value)}
                                    className="image-color-selector"
                                >
                                    <option value="">Select Color</option>
                                    <option value="WHITE">White</option>
                                    <option value="BLACK">Black</option>
                                    <option value="RED">Red</option>
                                    <option value="BLUE">Blue</option>
                                    <option value="GREEN">Green</option>
                                    <option value="YELLOW">Yellow</option>
                                </select>
                                <button type="button" onClick={() => handleRemovePreviewImage(index)} className="remove-preview-btn">
                                    X
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
                {editingProduct && (
                    <button type="button" onClick={() => {
                        setEditingProduct(null);
                        setNewProduct({
                            title: '',
                            description: '',
                            price: '',
                            product_type: 'TOTEBAG',
                            available_sizes: '',
                            images: []
                        });
                        setPreviewImages([]);
                        setRemovedImageIds([]);
                        setImageColors({});
                    }} className="cancel-edit-btn">
                        Cancel Edit
                    </button>
                )}
            </form>

            <div className="product-list">
                <h3>Existing Products</h3>
                {isLoading && <p>Loading products...</p>}
                {products.length === 0 && !isLoading && <p>No products added yet.</p>}
                {!isLoading && products.length > 0 && (
                    <div className="products-grid">
                        {products.map(product => (
                            <div key={product.id} className="product-card">
                                <div className="product-images">
                                    {product.images && product.images.length > 0 ? (
                                        product.images.map((img, imgIndex) => (
                                            <div key={imgIndex} className="product-thumbnail-container">
                                                <img src={img.image} alt={product.title} className="product-thumbnail" />
                                                {/* {img.color && <span className="image-color-display">Color: {img.color}</span>} */}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-image-placeholder">
                                            No images
                                        </div>
                                    )}
                                </div>
                                <div className="product-info">
                                    <h4>{product.title}</h4>
                                    <p className="product-description">{product.description}</p>
                                    <p className="product-price">${product.price}</p>
                                    {product.product_type === 'TSHIRT' && product.available_sizes && (
                                        <p className="product-sizes">Sizes: {product.available_sizes}</p>
                                    )}
                                </div>
                                <div className="product-actions">
                                    <button 
                                        onClick={() => handleEdit(product)}
                                        className="edit-btn"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product.id)}
                                        className="delete-btn"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


export default AdminProducts;