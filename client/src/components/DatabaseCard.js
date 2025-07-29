import { useState, useEffect } from 'react';
import {
  DatabaseIcon,
  DocumentTextIcon,
  ChartBarIcon,
  KeyIcon,
  ArrowLeftIcon,
  RefreshIcon,
  EyeIcon,
  CollectionIcon,
  CubeIcon,
  ClockIcon,
  DuplicateIcon,
  TrashIcon
} from '@heroicons/react/outline';

function DatabaseCard({ database, serverUrl, onBack }) {
  const [collections, setCollections] = useState([]);
  const [databaseDetails, setDatabaseDetails] = useState(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    if (database) {
      fetchDatabaseDetails();
      fetchCollections();
    }
  }, [database]);

  const fetchDatabaseDetails = async () => {
    setIsLoadingDetails(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/database/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl,
          database_name: database.name
        })
      });

      const result = await response.json();

      if (result.success) {
        setDatabaseDetails(result);
      } else {
        setError('Failed to fetch database details: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      setError('Failed to fetch database details: ' + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchCollections = async () => {
    setIsLoadingCollections(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/collection/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl,
          database_name: database.name
        })
      });

      const result = await response.json();

      if (result.success && result.collections) {
        setCollections(result.collections);
      } else {
        setError('Failed to fetch collections: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      setError('Failed to fetch collections: ' + error.message);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleRefresh = () => {
    fetchDatabaseDetails();
    fetchCollections();
  };

  const handleCollectionClick = (collection) => {
    setSelectedCollection(collection);
    // Future: This will show collection details
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Databases
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Databases
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <DatabaseIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{database.name}</h1>
                  <p className="text-sm text-gray-500">Database Details and Collections</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isLoadingCollections || isLoadingDetails}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <RefreshIcon className={`h-4 w-4 mr-2 ${(isLoadingCollections || isLoadingDetails) ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Database Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Size</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatBytes(database.sizeOnDisk)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CollectionIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Collections</p>
                <p className="text-lg font-semibold text-gray-900">
                  {collections.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {database.empty ? (
                    <span className="text-yellow-600">Empty</span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <KeyIcon className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Data Size</p>
                <p className="text-lg font-semibold text-gray-900">
                  {databaseDetails?.dataSize ? formatBytes(databaseDetails.dataSize) : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collections Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
              {isLoadingCollections && (
                <div className="flex items-center text-sm text-gray-500">
                  <RefreshIcon className="animate-spin h-4 w-4 mr-2" />
                  Loading collections...
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {isLoadingCollections ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshIcon className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading collections...</p>
                </div>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-8">
                <CollectionIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Collections Found</h3>
                <p className="text-gray-500">This database doesn't have any collections yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((collection, index) => (
                  <div
                    key={index}
                    onClick={() => handleCollectionClick(collection)}
                    className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <DocumentTextIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                            {collection.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Collection
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Future: Copy collection functionality
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="Copy Collection"
                        >
                          <DuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Future: Drop collection functionality
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Drop Collection"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        Click to view collection details
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Database Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Database Information</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Database Name</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{database.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Size on Disk</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatBytes(database.sizeOnDisk)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Number of Collections</dt>
                <dd className="mt-1 text-sm text-gray-900">{collections.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Database Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    database.empty 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {database.empty ? 'Empty' : 'Active'}
                  </span>
                </dd>
              </div>
              {databaseDetails?.indexSize && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Index Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatBytes(databaseDetails.indexSize)}</dd>
                </div>
              )}
              {databaseDetails?.dataSize && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Data Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatBytes(databaseDetails.dataSize)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Future: Collection Details View */}
        {selectedCollection && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Collection: {selectedCollection.name}
                </h2>
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center py-8">
                Collection details view will be implemented in the next step
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DatabaseCard;