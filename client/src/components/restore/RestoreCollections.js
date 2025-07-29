// RestoreCollections.js
import React, { useState, useEffect } from 'react';
import { 
  CollectionIcon, 
  DatabaseIcon, 
  ServerIcon, 
  UploadIcon, 
  ExclamationIcon, 
  CheckCircleIcon,
  RefreshIcon,
  ArrowRightIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/outline';

const RestoreCollections = ({ 
  connectionString, 
  setConnectionString, 
  uploadedBackupInfo, 
  setUploadedBackupInfo,
  onRestoreComplete 
}) => {
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [backupCollections, setBackupCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(new Set());
  const [targetDatabase, setTargetDatabase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
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
        
        // Extract collections from backup info
        if (uploadResult.backup_info?.collections && Array.isArray(uploadResult.backup_info.collections)) {
          const collections = uploadResult.backup_info.collections.map(col => 
            typeof col === 'string' ? col : col.name
          );
          setBackupCollections(collections);
        } else {
          setBackupCollections([]);
        }
        
        // Reset selections when new file is uploaded
        setSelectedCollections(new Set());
        setRestoreResult(null);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
      setBackupCollections([]);
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
        
        // Auto-select first database if none selected
        if (data.databases.length > 0 && !targetDatabase) {
          setTargetDatabase(data.databases[0].name);
        }
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

  const handleCollectionToggle = (collectionName) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(collectionName)) {
      newSelected.delete(collectionName);
    } else {
      newSelected.add(collectionName);
    }
    setSelectedCollections(newSelected);
  };

  const handleSelectAllCollections = () => {
    if (selectedCollections.size === backupCollections.length) {
      setSelectedCollections(new Set());
    } else {
      setSelectedCollections(new Set(backupCollections));
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

    if (!targetDatabase) {
      setError('Please select a target database');
      return;
    }

    // If collections are available but none selected, show error
    if (backupCollections.length > 0 && selectedCollections.size === 0) {
      setError('Please select at least one collection to restore');
      return;
    }

    setIsRestoring(true);
    setError('');
    setRestoreResult(null);

    try {
      const restorePayload = {
        connection_string: connectionString,
        backup_name: uploadedBackupName,
        target_database: targetDatabase,
        confirm: true
      };

      // Add selected collections if any are specified
      if (selectedCollections.size > 0) {
        restorePayload.selected_collections = Array.from(selectedCollections);
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
        throw new Error(errorData.message || 'Failed to restore collections');
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
    setBackupCollections([]);
    setSelectedCollections(new Set());
    setTargetDatabase('');
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
          <CollectionIcon className="h-5 w-5 mr-2 text-blue-600" />
          Collection Restoration
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Restore specific collections from a backup to any target database
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
              ? 'border-blue-400 bg-blue-50 scale-105' 
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
                <UploadIcon className={`h-12 w-12 mx-auto ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
              
              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-2 ${isDragOver ? 'text-blue-700' : 'text-gray-700'}`}>
                  {isDragOver ? 'Drop your backup file here' : 'Choose or drag backup file'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select a MongoDB backup file to restore collections from
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="file"
                  accept=".zip,.tar,.gz,.bson"
                  onChange={handleFileUpload}
                  disabled={isUploadingFile}
                  id="file-upload"
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors ${
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
                    setBackupCollections([]);
                    setSelectedCollections(new Set());
                    const fileInput = document.getElementById('file-upload');
                    if (fileInput) fileInput.value = '';
                  }}
                  disabled={isUploadingFile || isRestoring}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  Upload different file
                </button>
              </div>
            </div>
          )}

          {isUploadingFile && (
            <div className="mt-6 flex items-center justify-center">
              <RefreshIcon className="h-5 w-5 animate-spin text-blue-600 mr-3" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-600">Uploading and processing backup file...</p>
                <p className="text-xs text-blue-500 mt-1">This may take a moment for large files</p>
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
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <ServerIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          MongoDB server where collections will be restored
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
                <span className="font-medium">Collections Available:</span>
                <p className="text-blue-600">{backupCollections.length || uploadedBackupInfo.files_count || 'Auto-detect'}</p>
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

      {/* Collections Selection */}
      {backupCollections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Select Collections to Restore ({selectedCollections.size}/{backupCollections.length})
            </h4>
            <button
              onClick={handleSelectAllCollections}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {selectedCollections.size === backupCollections.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {backupCollections.map((collection, index) => (
              <label
                key={collection}
                className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  index !== backupCollections.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCollections.has(collection)}
                  onChange={() => handleCollectionToggle(collection)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <CollectionIcon className="h-4 w-4 ml-3 mr-2 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{collection}</span>
                {selectedCollections.has(collection) && (
                  <CheckIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* No Collections Warning */}
      {uploadedBackupInfo && backupCollections.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
            <InformationCircleIcon className="h-4 w-4 mr-2" />
            Collection Information
          </h4>
          <p className="text-sm text-yellow-700">
            Collections will be auto-detected during restore. All collections from the backup will be restored to the target database.
          </p>
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
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <input
                  type="radio"
                  name="targetDatabase"
                  value={db.name}
                  checked={targetDatabase === db.name}
                  onChange={(e) => setTargetDatabase(e.target.value)}
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
                  <CheckIcon className="h-5 w-5 text-blue-600 absolute top-3 right-3" />
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
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
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
      </div>

      {/* Restore Preview */}
      {uploadedBackupInfo && targetDatabase && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
            <InformationCircleIcon className="h-4 w-4 mr-2" />
            Restore Preview
          </h4>
          <div className="text-sm text-yellow-700 space-y-2">
            <div>
              <span className="font-medium">Collections to restore:</span>
              <div className="mt-1 text-xs">
                {selectedCollections.size > 0 ? (
                  Array.from(selectedCollections).map((collection, index) => (
                    <span key={collection} className="inline-block">
                      {collection}
                      {index < selectedCollections.size - 1 && ', '}
                    </span>
                  ))
                ) : (
                  <span className="text-yellow-600">All collections from backup</span>
                )}
              </div>
            </div>
            <div className="flex items-center pt-2">
              <span className="font-medium">Source:</span>
              <span className="ml-2">{uploadedBackupInfo?.database}</span>
              <ArrowRightIcon className="h-4 w-4 mx-2 text-yellow-600" />
              <span className="font-medium">Target:</span>
              <span className="ml-2">{targetDatabase}</span>
            </div>
            <div className="text-xs text-yellow-600 mt-2">
              <strong>Note:</strong> Existing collections with the same names will be replaced.
            </div>
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
            <h4 className="text-sm font-medium text-green-800">Collections Restored Successfully</h4>
            <p className="text-sm text-green-700 mt-1">{restoreResult.message}</p>
            {restoreResult.restore && (
              <div className="text-xs text-green-600 mt-3 space-y-1 bg-green-100 p-2 rounded">
                <p><strong>Target Database:</strong> {restoreResult.restore.target_database}</p>
                <p><strong>Collections Restored:</strong> {
                  Array.isArray(restoreResult.restore.collections_restored) 
                    ? restoreResult.restore.collections_restored.join(', ') 
                    : restoreResult.restore.collections_restored
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
          {uploadedBackupInfo && targetDatabase && (
            <span>
              Ready to restore {
                selectedCollections.size > 0 
                  ? `${selectedCollections.size} collection(s)` 
                  : 'all collections'
              } to {targetDatabase}
            </span>
          )}
        </div>
        
        <div className="flex space-x-3">
          {/* Clear Selection Button */}
          {selectedCollections.size > 0 && (
            <button
              onClick={() => setSelectedCollections(new Set())}
              disabled={isRestoring || isUploadingFile}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Selection
            </button>
          )}

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
              !targetDatabase || 
              isRestoring ||
              isUploadingFile ||
              (backupCollections.length > 0 && selectedCollections.size === 0)
            }
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isRestoring ? (
              <>
                <RefreshIcon className="animate-spin h-4 w-4 mr-2" />
                Restoring Collections...
              </>
            ) : (
              <>
                <CollectionIcon className="h-4 w-4 mr-2" />
                Restore {
                  selectedCollections.size > 0 
                    ? `${selectedCollections.size} Collection(s)` 
                    : 'Collections'
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreCollections;