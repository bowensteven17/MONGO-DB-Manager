// src/components/CopyCollectionModal.js - Improved version with better messaging
import { useState, useEffect } from 'react';
import { XIcon, DatabaseIcon, DocumentDuplicateIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/outline';

const CopyCollectionModal = ({ 
  isOpen, 
  onClose, 
  sourceDatabase, 
  sourceCollection, 
  connectionString,
  allDatabases = [],
  onCopySuccess 
}) => {
  const [targetDatabase, setTargetDatabase] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copyResult, setCopyResult] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Filter out source database from available targets
  const availableDatabases = allDatabases.filter(db => db.name !== sourceDatabase);

  useEffect(() => {
    if (isOpen && sourceCollection) {
      // Reset form when modal opens
      setCollectionName(`${sourceCollection}_copy`);
      // Reset target database to force fresh selection
      setTargetDatabase('');
      setError('');
      setSuccess(false);
      setCopyResult(null);
      setCountdown(0);
    }
  }, [isOpen, sourceCollection]);

  // Separate effect to initialize target database when available databases are loaded
  useEffect(() => {
    if (isOpen && sourceCollection && availableDatabases.length > 0 && !targetDatabase) {
      setTargetDatabase(availableDatabases[0].name);
    }
  }, [isOpen, sourceCollection, availableDatabases.length, targetDatabase]);
  useEffect(() => {
    let interval = null;
    
    if (success && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Close modal when countdown reaches 0
            setTimeout(() => handleClose(), 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [success, countdown]);

  const handleCopy = async () => {
    if (!targetDatabase || !collectionName.trim()) {
      setError('Please select a target database and enter a collection name');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:5000/api/collection/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_string: connectionString,
          source_database: sourceDatabase,
          target_database: targetDatabase,
          collection_name: sourceCollection,
          new_collection_name: collectionName.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        setSuccess(false); // Ensure success is false on error
        
        if (response.status === 409 || result.message?.includes('already exists')) {
          setError(`⚠️ Collection "${collectionName}" already exists in database "${targetDatabase}". Please choose a different name or delete the existing collection first.`);
        } else if (result.message?.includes('does not exist')) {
          setError(`❌ Source collection "${sourceCollection}" no longer exists in "${sourceDatabase}". Please refresh and try again.`);
        } else {
          setError(`❌ Copy failed: ${result.message || 'Unknown error occurred'}`);
        }
        return;
      }

      // Success - store result and show success message
      setCopyResult(result);
      setSuccess(true);
      setError('');
      
      // Start countdown
      setCountdown(5);
      
      // Notify parent component
      if (onCopySuccess) {
        onCopySuccess(targetDatabase, collectionName);
      }
      
    } catch (error) {
      console.error('Error copying collection:', error);
      setError('🔌 Network error: Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      setSuccess(false);
      setCopyResult(null);
      setCountdown(0);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <DocumentDuplicateIcon className="h-6 w-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Copy Collection
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Source Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Source</h4>
            <div className="flex items-center text-sm text-gray-600">
              <DatabaseIcon className="h-4 w-4 mr-2" />
              <span className="font-medium">{sourceDatabase}</span>
              <span className="mx-2">•</span>
              <span>{sourceCollection}</span>
            </div>
          </div>

          {/* Target Database Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Database
            </label>
            {allDatabases.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
                🔄 Loading databases...
              </div>
            ) : availableDatabases.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
                ⚠️ No other databases available. Create a new database first.
              </div>
            ) : (
              <select
                value={targetDatabase}
                onChange={(e) => setTargetDatabase(e.target.value)}
                disabled={isLoading || success}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
              >
                {availableDatabases.map((db) => (
                  <option key={db.name} value={db.name}>
                    {db.name} ({db.collections || 0} collections)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Collection Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Collection Name
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              disabled={isLoading || success}
              placeholder="Enter collection name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Collection names cannot start with 'system.' or contain special characters
            </p>
          </div>

          {/* Success Message */}
          {success && copyResult && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-2">
                    ✅ Collection copied successfully!
                  </p>
                  <div className="text-xs text-green-700 space-y-1">
                    <p><strong>Copied to:</strong> {targetDatabase}/{collectionName}</p>
                    {copyResult.statistics && (
                      <>
                        <p><strong>Documents:</strong> {copyResult.statistics.documentsCopied?.toLocaleString() || 0}</p>
                        <p><strong>Indexes:</strong> {copyResult.statistics.indexesCopied || 0}</p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-green-600 mt-2 italic">
                    {countdown > 0 ? (
                      `This window will close automatically in ${countdown} second${countdown !== 1 ? 's' : ''}...`
                    ) : (
                      'Closing...'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-600">{error}</p>
                  {error.includes('already exists') && (
                    <div className="mt-2 text-xs text-red-500">
                      <p><strong>Suggestions:</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Try a different collection name</li>
                        <li>Check if the existing collection can be deleted</li>
                        <li>Use a different target database</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {isLoading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Copying collection...</p>
                  <p className="text-xs text-blue-500 mt-1">
                    This may take a while for large collections
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          {!success && (
            <button
              onClick={handleCopy}
              disabled={isLoading || availableDatabases.length === 0 || !collectionName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Copying...
                </span>
              ) : (
                'Copy Collection'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopyCollectionModal;