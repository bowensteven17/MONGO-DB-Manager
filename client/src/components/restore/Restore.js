import { useState, useRef } from 'react';
import {
  UploadIcon,
  CloudUploadIcon,
  DocumentIcon,
  TrashIcon,
  ServerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  RefreshIcon,
  InformationCircleIcon
} from '@heroicons/react/outline';

function Restore({ serverUrl, onRestoreSuccess }) {
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  
  // Restore settings
  const [targetServerUrl, setTargetServerUrl] = useState(serverUrl);
  const [targetDatabase, setTargetDatabase] = useState('');
  const [createNewDatabase, setCreateNewDatabase] = useState(false);
  
  // UI state
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedBackupInfo, setUploadedBackupInfo] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    // Filter for zip files (backup files should be zipped)
    const validFiles = files.filter(file => {
      const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
      const isBackup = file.name.toLowerCase().includes('backup');
      return isZip || isBackup;
    });

    if (validFiles.length === 0) {
      setError('Please upload ZIP files or backup files');
      return;
    }

    // Add to uploaded files list
    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'ready'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setError('');
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setError('');
    setSuccessMessage('');
    setUploadedBackupInfo(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRestore = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one backup file');
      return;
    }

    if (!targetServerUrl.trim()) {
      setError('Please enter a target server URL');
      return;
    }

    if (createNewDatabase && !targetDatabase.trim()) {
      setError('Please enter a database name when creating a new database');
      return;
    }

    setIsRestoring(true);
    setError('');
    setSuccessMessage('');

    try {
      const restoreResults = [];

      for (const fileData of uploadedFiles) {
        // Update file status
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'uploading' }
              : f
          )
        );

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('backup_file', fileData.file);
        formData.append('connection_string', targetServerUrl);
        
        if (targetDatabase.trim()) {
          formData.append('target_database', targetDatabase.trim());
        }
        
        formData.append('confirm', 'true'); // Required for restore operations

        try {
          // First, upload the file to the server
          const uploadResponse = await fetch('http://localhost:5000/api/backup/upload', {
            method: 'POST',
            body: formData
          });

          const uploadResult = await uploadResponse.json();

          if (!uploadResult.success) {
            throw new Error(`Upload failed: ${uploadResult.message}`);
          }

          // Store backup info for user reference
          if (!uploadedBackupInfo) {
            setUploadedBackupInfo(uploadResult.backup_info);
          }

          // Update file status
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'restoring' }
                : f
            )
          );

          // Prepare restore payload
          const restorePayload = {
            connection_string: targetServerUrl,
            backup_name: uploadResult.backup_name,
            confirm: true,
            options: {
              drop: false // Don't drop existing collections by default
            }
          };

          // Add target database if specified or if creating new database
          if (createNewDatabase && targetDatabase.trim()) {
            restorePayload.target_database = targetDatabase.trim();
          } else if (!createNewDatabase && targetDatabase.trim()) {
            restorePayload.target_database = targetDatabase.trim();
          }

          // Now restore from the uploaded backup
          const restoreResponse = await fetch('http://localhost:5000/api/backup/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(restorePayload)
          });

          const restoreResult = await restoreResponse.json();

          if (!restoreResult.success) {
            throw new Error(`Restore failed: ${restoreResult.message}`);
          }

          // Update file status to success
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'success' }
                : f
            )
          );

          restoreResults.push({
            fileName: fileData.name,
            database: restoreResult.restore?.target_database || uploadedBackupInfo?.database || 'Unknown',
            collections: restoreResult.restore?.collections_restored || 'All',
            method: restoreResult.restore?.method || 'Unknown'
          });

        } catch (fileError) {
          // Update file status to error
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'error', error: fileError.message }
                : f
            )
          );
          
          console.error(`Error restoring ${fileData.name}:`, fileError);
        }
      }

      if (restoreResults.length > 0) {
        setSuccessMessage(
          `Successfully restored ${restoreResults.length} backup(s). ` +
          `Databases restored: ${restoreResults.map(r => r.database).join(', ')}`
        );
        
        // Call the refresh callback if provided, with a small delay
        // to allow MongoDB to update its internal database list
        if (onRestoreSuccess) {
          setTimeout(() => {
            onRestoreSuccess();
          }, 1500); // 1.5 second delay to ensure MongoDB has updated
        }
      } else {
        setError('No backups were successfully restored');
      }

    } catch (error) {
      setError(`Restore operation failed: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const getFileStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <RefreshIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'restoring':
        return <RefreshIcon className="h-4 w-4 text-orange-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <DocumentIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFileStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'restoring':
        return 'Restoring...';
      case 'success':
        return 'Restored';
      case 'error':
        return 'Failed';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <UploadIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Restore Management</h1>
              <p className="text-sm text-gray-500">Upload and restore MongoDB backups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-green-700 text-sm">{successMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 pb-24 space-y-6">
        
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upload Backup Files</h2>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop ZIP backup files or click to browse
            </p>
          </div>
          
          <div className="p-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <CloudUploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop backup files here
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse for ZIP files
              </p>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Choose Files
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.bak"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    Uploaded Files ({uploadedFiles.length})
                  </h3>
                  <button
                    onClick={clearAllFiles}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        {getFileStatusIcon(file.status)}
                        <div className="ml-3 min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <span>{formatFileSize(file.size)}</span>
                            <span className="mx-2">•</span>
                            <span className={`font-medium ${
                              file.status === 'success' ? 'text-green-600' :
                              file.status === 'error' ? 'text-red-600' :
                              file.status === 'uploading' || file.status === 'restoring' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {getFileStatusText(file.status)}
                            </span>
                          </div>
                          {file.error && (
                            <p className="text-xs text-red-600 mt-1">{file.error}</p>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading' || file.status === 'restoring'}
                        className="ml-3 p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Restore Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Restore Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure where to restore the backup data
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Target Server URL */}
            <div>
              <label htmlFor="targetServerUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Target Server URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="targetServerUrl"
                  value={targetServerUrl}
                  onChange={(e) => setTargetServerUrl(e.target.value)}
                  placeholder="mongodb://localhost:27017"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <ServerIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                MongoDB server where the backup will be restored
              </p>
            </div>

            {/* Original Database Info */}
            {uploadedBackupInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Backup Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Original Database:</strong> {uploadedBackupInfo.database}</p>
                  <p><strong>Size:</strong> {uploadedBackupInfo.size ? formatFileSize(uploadedBackupInfo.size) : 'Unknown'}</p>
                  <p><strong>Files:</strong> {uploadedBackupInfo.files_count || 'Unknown'} files</p>
                </div>
              </div>
            )}

            {/* Database Restore Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="restoreOption"
                    checked={!createNewDatabase}
                    onChange={() => setCreateNewDatabase(false)}
                    className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Restore to Original Database
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="restoreOption"
                    checked={createNewDatabase}
                    onChange={() => setCreateNewDatabase(true)}
                    className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Create New Database
                  </span>
                </label>
              </div>

              {/* Target Database Input */}
              <div>
                <label htmlFor="targetDatabase" className="block text-sm font-medium text-gray-700 mb-2">
                  {createNewDatabase ? 'New Database Name' : 'Target Database (Optional)'}
                </label>
                <input
                  type="text"
                  id="targetDatabase"
                  value={targetDatabase}
                  onChange={(e) => setTargetDatabase(e.target.value)}
                  placeholder={
                    createNewDatabase 
                      ? "Enter new database name" 
                      : uploadedBackupInfo?.database || "Leave empty to use original database name"
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {createNewDatabase 
                    ? "This will create a new database with the specified name"
                    : "Specify a different database name to restore to, or leave empty to use the original name"
                  }
                </p>
              </div>
            </div>

            {/* Restore Options Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Restore Information</h4>
                  <div className="text-sm text-blue-700 mt-1 space-y-1">
                    <p>• <strong>Original Database:</strong> Restores to the same database name from backup</p>
                    <p>• <strong>Create New Database:</strong> Creates a new database with your specified name</p>
                    <p>• Collections will be restored with their original names and data</p>
                    <p>• Existing data will be preserved (no automatic drop)</p>
                    <p>• Large backups may take several minutes to restore</p>
                    {createNewDatabase && targetDatabase && (
                      <p className="font-medium text-green-700">
                        → Will create new database: "{targetDatabase}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Restore Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleRestore}
          disabled={
            isRestoring || 
            uploadedFiles.length === 0 || 
            !targetServerUrl.trim() ||
            (createNewDatabase && !targetDatabase.trim())
          }
          className="flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isRestoring ? (
            <>
              <RefreshIcon className="animate-spin h-5 w-5 mr-2" />
              Restoring...
            </>
          ) : (
            <>
              <UploadIcon className="h-5 w-5 mr-2" />
              Restore Backups ({uploadedFiles.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Restore;