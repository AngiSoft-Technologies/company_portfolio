import React, { useState, useRef } from 'react';
import { FaUpload, FaTimes, FaImage, FaFile } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';
import { toast } from '../utils/toast';
import { validators } from '../utils/validation';

const FileUpload = ({
    onUpload,
    accept = '*/*',
    maxSizeMB = 10,
    multiple = false,
    category = 'general',
    ownerType = 'general',
    ownerId = '',
    className = '',
    label = 'Upload File',
    showPreview = true
}) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const newFiles = [];
        const newPreviews = [];

        selectedFiles.forEach((file) => {
            // Validate file size
            const sizeError = validators.fileSize(file, maxSizeMB, file.name);
            if (sizeError) {
                toast.error(sizeError);
                return;
            }

            // Validate file type if accept is specified
            if (accept !== '*/*') {
                const allowedTypes = accept.split(',').map(t => t.trim());
                const typeError = validators.fileType(file, allowedTypes, file.name);
                if (typeError) {
                    toast.error(typeError);
                    return;
                }
            }

            newFiles.push(file);

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    newPreviews.push({ file, url: e.target.result });
                    setPreviews([...previews, ...newPreviews]);
                };
                reader.readAsDataURL(file);
            }
        });

        if (multiple) {
            setFiles([...files, ...newFiles]);
        } else {
            setFiles(newFiles);
            setPreviews(newPreviews);
        }
    };

    const removeFile = (index) => {
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);

        if (previews[index]) {
            const newPreviews = [...previews];
            newPreviews.splice(index, 1);
            setPreviews(newPreviews);
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            toast.warning('Please select at least one file');
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('ownerType', ownerType);
                formData.append('ownerId', ownerId);
                formData.append('category', category);

                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/admin/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Upload failed');
                }

                return await response.json();
            });

            const results = await Promise.all(uploadPromises);
            toast.success(`Successfully uploaded ${results.length} file(s)!`);
            
            if (onUpload) {
                onUpload(results);
            }

            // Clear files after successful upload
            setFiles([]);
            setPreviews([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className={className}>
            <label className="block mb-2 font-semibold">{label}</label>
            
            {/* File Input */}
            <div className="mb-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileSelect}
                    className="hidden"
                    id={`file-upload-${category}`}
                    disabled={uploading}
                />
                <label
                    htmlFor={`file-upload-${category}`}
                    className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-teal-500 rounded-lg cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                    <FaUpload className="text-teal-600 dark:text-teal-400" />
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                        {uploading ? 'Uploading...' : 'Choose Files'}
                    </span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                    Max size: {maxSizeMB}MB {accept !== '*/*' && `• Accepted: ${accept}`}
                </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2 mb-4">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                {file.type.startsWith('image/') ? (
                                    <FaImage className="text-teal-600 text-xl" />
                                ) : (
                                    <FaFile className="text-gray-600 text-xl" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                                disabled={uploading}
                            >
                                <FaTimes />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Previews */}
            {showPreview && previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                            <img
                                src={preview.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => removeFile(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <FaTimes className="text-xs" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && !uploading && (
                <button
                    onClick={handleUpload}
                    className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold transition-colors"
                >
                    Upload {files.length} File{files.length > 1 ? 's' : ''}
                </button>
            )}

            {uploading && (
                <div className="flex items-center justify-center gap-3 py-4">
                    <LoadingSpinner size="md" />
                    <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                </div>
            )}
        </div>
    );
};

export default FileUpload;

