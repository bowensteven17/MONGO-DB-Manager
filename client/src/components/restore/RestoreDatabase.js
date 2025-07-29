// RestoreDatabase.js
import React, { useState } from 'react';
import { 
  DatabaseIcon, 
  ServerIcon, 
  UploadIcon, 
  ExclamationIcon, 
  CheckCircleIcon,
  RefreshIcon,
  InformationCircleIcon
} from '@heroicons/react/outline';

const RestoreDatabase = ({ 
  connectionString, 
  setConnectionString, 
  uploadedBackupInfo, 
  setUploadedBackupInfo,
  onRestoreComplete 
}) => {
  const [createNewDatabase, setCreateNewDatabase] = useState(false);
  const [targetDatabase, setTargetDatabase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const [error, setError] = useState('');
  const [uploadedBackupName, setUploadedBackupName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.zip', '.tar', '.gz', '.bson'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      setError('Invalid file type. Please upload a .zip, .tar, .gz, or .bson file.');
      return;
    }

    setError('');
    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append('backup_file', file);

    try {
      const response = await fetch('http://localhost:5000/api/backup/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload backup file');
      }

      const uploadResult = await response.json();
      
      if (uploadResult.success) {
        setUploadedBackupInfo(uploadResult.backup_info);
        setUploadedBackupName(uploadResult.backup_name);
        
        // Set default target database name
        if (!createNewDatabase && uploadResult.backup_info?.database) {
          setTargetDatabase(uploadResult.backup_info.database);
        }
        
        // Reset previous results
        setRestoreResult(null);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
      setUploadedBackupInfo(null);
      setUploadedBackupName('');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRestore = async () => {
    if (!uploadedBackupInfo || !uploadedBackupName) {
      setError('Please upload a backup file first');
      return;
    }

    if (!connectionString.trim()) {
      setError('Please provide a MongoDB connection string');
      return;
    }

    if (createNewDatabase && !targetDatabase.trim()) {
      setError('Please provide a target database name');
      return;
    }

    if (!createNewDatabase && !uploadedBackupInfo.database) {
      setError('Cannot determine original database name from backup');
      return;
    }

    setIsRestoring(true);
    setError('');
    setRestoreResult(null);

    try {
      const restorePayload = {
        connection_string: connectionString,
        backup_name: uploadedBackupName,
        confirm: true
      };

      // Add target database if creating new or if specified
      if (createNewDatabase && targetDatabase.trim()) {
        restorePayload.target_database = targetDatabase.trim();
      } else if (!createNewDatabase && uploadedBackupInfo.database) {
        restorePayload.target_database = uploadedBackupInfo.database;
      }

      const response = await fetch('http://localhost:5000/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restorePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore database');
      }

      const result = await response.json();
      
      if (result.success) {
        setRestoreResult(result);
        
        if (onRestoreComplete) {
          onRestoreComplete(result);
        }
        
        // Auto-cleanup after successful restore (with a small delay to show success message)
        setTimeout(() => {
          handleReset();
        }, 3000); // 3 seconds delay to show success message
      } else {
        throw new Error(result.message || 'Restore failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleRestoreOptionChange = (newDatabase) => {
    setCreateNewDatabase(newDatabase);
    if (newDatabase) {
      setTargetDatabase('');
    } else if (uploadedBackupInfo?.database) {
      setTargetDatabase(uploadedBackupInfo.database);
    }
    setError('');
  };

  const handleReset = () => {
    setUploadedBackupInfo(null);
    setUploadedBackupName('');
    setTargetDatabase('');
    setCreateNewDatabase(false);
    setError('');
    setRestoreResult(null);
    // Clear file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <DatabaseIcon className="h-5 w-5 mr-2 text-green-600" />
          Database Restoration
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Restore an entire database from a backup file
        </p>
      </div>

      {/* File Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Upload Backup File
        </label>
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragOver 
              ? 'border-green-400 bg-green-50 scale-105' 
              : uploadedBackupInfo 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!uploadedBackupInfo ? (
            <>
              <div className={`mx-auto mb-4 ${isDragOver ? 'scale-110' : ''} transition-transform duration-200`}>
                <UploadIcon className={`h-12 w-12 mx-auto ${isDragOver ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
              
              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-2 ${isDragOver ? 'text-green-700' : 'text-gray-700'}`}>
                  {isDragOver ? 'Drop your backup file here' : 'Choose or drag backup file'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select a MongoDB backup file to restore entire database from
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="file"
                  accept=".zip,.tar,.gz,.bson"
                  onChange={handleFileUpload}
                  disabled={isUploadingFile}
                  id="file-upload-db"
                  className="hidden"
                />
                <label
                  htmlFor="file-upload-db"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer transition-colors ${
                    isUploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <UploadIcon className="h-5 w-5 mr-2" />
                  Browse Files
                </label>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Supported formats:</strong> .zip, .tar, .gz, .bson</p>
                  <p><strong>Max file size:</strong> 500MB</p>
                  <p><strong>Drag & Drop:</strong> You can also drag files directly into this area</p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">File uploaded successfully!</h3>
                <p className="text-sm text-green-600 mb-4">
                  {uploadedBackupName || 'Backup file ready for restore'}
                </p>
                <button
                  onClick={() => {
                    setUploadedBackupInfo(null);
                    setUploadedBackupName('');
                    setTargetDatabase('');
                    const fileInput = document.getElementById('file-upload-db');
                    if (fileInput) fileInput.value = '';
                  }}
                  disabled={isUploadingFile || isRestoring}
                  className="text-sm text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                >
                  Upload different file
                </button>
              </div>
            </div>
          )}

          {isUploadingFile && (
            <div className="mt-6 flex items-center justify-center">
              <RefreshIcon className="h-5 w-5 animate-spin text-green-600 mr-3" />
              <div className="text-left">
                <p className="text-sm font-medium text-green-600">Uploading and processing backup file...</p>
                <p className="text-xs text-green-500 mt-1">This may take a moment for large files</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection String Section */}
      <div>
        <label htmlFor="connectionString" className="block text-sm font-medium text-gray-700 mb-2">
          MongoDB Connection String
        </label>
        <div className="relative">
          <input
            id="connectionString"
            type="text"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="mongodb://localhost:27017"
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <ServerIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          MongoDB server where the backup will be restored
        </p>
      </div>

      {/* Backup Information Display */}
      {uploadedBackupInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
            <InformationCircleIcon className="h-4 w-4 mr-2" />
            Backup Information
          </h4>
          <div className="text-sm text-blue-700 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Original Database:</span>
                <p className="text-blue-600">{uploadedBackupInfo.database}</p>
              </div>
              <div>
                <span className="font-medium">File Size:</span>
                <p className="text-blue-600">{formatFileSize(uploadedBackupInfo.size)}</p>
              </div>
              <div>
                <span className="font-medium">Collections:</span>
                <p className="text-blue-600">{uploadedBackupInfo.collections?.length || uploadedBackupInfo.files_count || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium">Backup Method:</span>
                <p className="text-blue-600">{uploadedBackupInfo.method || 'Auto-detected'}</p>
              </div>
            </div>
            {uploadedBackupInfo.created_at && (
              <div className="pt-2 border-t border-blue-200">
                <span className="font-medium">Created:</span>
                <p className="text-blue-600">{new Date(uploadedBackupInfo.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restore Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Restore Options</h4>
        
        <div className="space-y-3">
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="restoreOption"
              checked={!createNewDatabase}
              onChange={() => handleRestoreOptionChange(false)}
              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500 mt-0.5"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">
                Restore to Original Database
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {uploadedBackupInfo?.database ? 
                  `Database: ${uploadedBackupInfo.database}` : 
                  'Restore to the same database name as in the backup'
                }
              </p>
            </div>
          </label>
          
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="restoreOption"
              checked={createNewDatabase}
              onChange={() => handleRestoreOptionChange(true)}
              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500 mt-0.5"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">
                Create New Database
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Restore backup data to a new database with a custom name
              </p>
            </div>
          </label>
        </div>

        {/* Target Database Input */}
        {createNewDatabase && (
          <div className="mt-4 pl-7">
            <label htmlFor="targetDatabase" className="block text-sm font-medium text-gray-700 mb-2">
              New Database Name
            </label>
            <input
              id="targetDatabase"
              type="text"
              value={targetDatabase}
              onChange={(e) => setTargetDatabase(e.target.value)}
              placeholder="Enter new database name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a unique name for the new database
            </p>
          </div>
        )}
      </div>

      {/* Restore Preview */}
      {uploadedBackupInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
            <InformationCircleIcon className="h-4 w-4 mr-2" />
            Restore Preview
          </h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>
              <strong>Source:</strong> {uploadedBackupInfo.database} ({uploadedBackupInfo.collections?.length || uploadedBackupInfo.files_count || 'Unknown'} collections)
            </p>
            <p>
              <strong>Target:</strong> {createNewDatabase ? targetDatabase || 'New database name required' : uploadedBackupInfo.database}
            </p>
            <p>
              <strong>Action:</strong> {createNewDatabase ? 'Create new database and restore data' : 'Replace existing database data'}
            </p>
            {!createNewDatabase && (
              <div className="text-xs text-yellow-600 mt-2 p-2 bg-yellow-100 rounded">
                <strong>Warning:</strong> This will replace all existing data in the target database.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <ExclamationIcon className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {restoreResult && restoreResult.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-green-800">Database Restored Successfully</h4>
            <p className="text-sm text-green-700 mt-1">{restoreResult.message}</p>
            {restoreResult.restore && (
              <div className="text-xs text-green-600 mt-3 space-y-1 bg-green-100 p-2 rounded">
                <p><strong>Target Database:</strong> {restoreResult.restore.target_database}</p>
                <p><strong>Original Database:</strong> {restoreResult.restore.original_database}</p>
                <p><strong>Collections Restored:</strong> {
                  Array.isArray(restoreResult.restore.collections_restored) 
                    ? restoreResult.restore.collections_restored.length 
                    : 'All'
                }</p>
                <p><strong>Source Backup:</strong> {restoreResult.restore.source_backup}</p>
                <p><strong>Method:</strong> {restoreResult.restore.method || 'Standard'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {uploadedBackupInfo && (
            <span>
              Ready to restore {uploadedBackupInfo.database} to {
                createNewDatabase 
                  ? (targetDatabase || 'new database') 
                  : uploadedBackupInfo.database
              }
            </span>
          )}
        </div>
        
        <div className="flex space-x-3">
          {/* Reset Button */}
          {uploadedBackupInfo && (
            <button
              onClick={handleReset}
              disabled={isRestoring || isUploadingFile}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
          )}
          
          {/* Restore Button */}
          <button
            onClick={handleRestore}
            disabled={
              !uploadedBackupInfo || 
              !connectionString.trim() || 
              isRestoring || 
              isUploadingFile ||
              (createNewDatabase && !targetDatabase.trim())
            }
            className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isRestoring ? (
              <>
                <RefreshIcon className="animate-spin h-4 w-4 mr-2" />
                Restoring Database...
              </>
            ) : (
              <>
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Restore Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreDatabase;