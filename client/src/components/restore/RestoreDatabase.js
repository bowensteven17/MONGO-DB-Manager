// RestoreDatabase.js
import React, { useState, useEffect } from 'react';
import { 
  DatabaseIcon, 
  ServerIcon, 
  UploadIcon, 
  ExclamationIcon, 
  CheckCircleIcon,
  RefreshIcon,
  InformationCircleIcon,
  CheckIcon
} from '@heroicons/react/outline';

const RestoreDatabase = ({ 
  connectionString, 
  setConnectionString, 
  uploadedBackupInfo, 
  setUploadedBackupInfo,
  onRestoreComplete 
}) => {
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [targetDatabase, setTargetDatabase] = useState('');
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [createNewDatabase, setCreateNewDatabase] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
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
        
        // Reset database selection when new file is uploaded
        setTargetDatabase('');
        setNewDatabaseName('');
        setCreateNewDatabase(false);
        
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

  const fetchAvailableDatabases = async () => {
    if (!connectionString.trim()) {
      setError('Please provide a MongoDB connection string first');
      return;
    }

    setIsLoadingDatabases(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/database/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connection_string: connectionString }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch databases');
      }

      const data = await response.json();
      
      if (data.success && data.databases) {
        setAvailableDatabases(data.databases);
      } else {
        throw new Error(data.message || 'Failed to fetch databases');
      }
    } catch (err) {
      setError(err.message);
      setAvailableDatabases([]);
    } finally {
      setIsLoadingDatabases(false);
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

    if (createNewDatabase && !newDatabaseName.trim()) {
      setError('Please provide a new database name');
      return;
    }

    if (!createNewDatabase && !targetDatabase) {
      setError('Please select a target database');
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

      // Add target database
      if (createNewDatabase) {
        restorePayload.target_database = newDatabaseName.trim();
      } else {
        restorePayload.target_database = targetDatabase;
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

  const handleReset = () => {
    setUploadedBackupInfo(null);
    setUploadedBackupName('');
    setTargetDatabase('');
    setNewDatabaseName('');
    setCreateNewDatabase(false);
    setAvailableDatabases([]);
    setError('');
    setRestoreResult(null);
    // Clear file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  // Auto-fetch databases when connection string changes
  useEffect(() => {
    if (connectionString.trim()) {
      fetchAvailableDatabases();
    }
  }, [connectionString]);

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

      {/* Target Database Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Select Target Database</h4>
          {availableDatabases.length > 0 && (
            <span className="text-xs text-gray-500">
              {availableDatabases.length} database(s) available
            </span>
          )}
        </div>

        {availableDatabases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableDatabases.map((db) => (
              <label
                key={db.name}
                className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  targetDatabase === db.name
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <input
                  type="radio"
                  name="targetDatabase"
                  value={db.name}
                  checked={targetDatabase === db.name}
                  onChange={(e) => {
                    setTargetDatabase(e.target.value);
                    setCreateNewDatabase(false);
                  }}
                  className="sr-only"
                />
                <DatabaseIcon className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{db.name}</p>
                  <p className="text-xs text-gray-500">
                    {db.collections || 0} collection{(db.collections || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                {targetDatabase === db.name && (
                  <CheckIcon className="h-5 w-5 text-green-600 absolute top-3 right-3" />
                )}
              </label>
            ))}
          </div>
        ) : connectionString.trim() ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <DatabaseIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">
              {isLoadingDatabases ? 'Loading databases...' : 'No databases found or connection failed'}
            </p>
            <button
              onClick={fetchAvailableDatabases}
              disabled={isLoadingDatabases}
              className="text-sm text-green-600 hover:text-green-800 disabled:text-gray-400 transition-colors"
            >
              {isLoadingDatabases ? 'Loading...' : 'Retry Connection'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <DatabaseIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Enter a connection string above to load available databases
            </p>
          </div>
        )}

        {/* Create New Database Option */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="databaseOption"
              checked={createNewDatabase}
              onChange={() => {
                setCreateNewDatabase(true);
                setTargetDatabase('');
              }}
              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500 mt-0.5"
            />
            <div className="ml-3 flex-1">
              <span className="text-sm font-medium text-gray-700">
                Create New Database
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Restore backup data to a new database with a custom name
              </p>
              
              {createNewDatabase && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={newDatabaseName}
                    onChange={(e) => setNewDatabaseName(e.target.value)}
                    placeholder="Enter new database name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Restore Preview */}
      {uploadedBackupInfo && (targetDatabase || (createNewDatabase && newDatabaseName)) && (
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
              <strong>Target:</strong> {createNewDatabase ? newDatabaseName : targetDatabase}
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
          {uploadedBackupInfo && (targetDatabase || (createNewDatabase && newDatabaseName)) && (
            <span>
              Ready to restore {uploadedBackupInfo.database} to {
                createNewDatabase ? newDatabaseName : targetDatabase
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
              (createNewDatabase && !newDatabaseName.trim()) ||
              (!createNewDatabase && !targetDatabase)
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