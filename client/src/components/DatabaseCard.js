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
  TrashIcon,
  TableIcon,
  CodeIcon,
  ViewGridIcon,
  CheckIcon,
  XIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/outline';
import CopyCollectionModal from './CopyCollectionModal';

function DatabaseCard({ database, serverUrl, onBack }) {
  const [collections, setCollections] = useState([]);
  const [databaseDetails, setDatabaseDetails] = useState(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [isLoadingCollectionDetails, setIsLoadingCollectionDetails] = useState(false);
  
  // Copy collection modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [collectionToCopy, setCollectionToCopy] = useState(null);
  const [allDatabases, setAllDatabases] = useState([]);

  useEffect(() => {
    if (database) {
      fetchDatabaseDetails();
      fetchCollections();
      fetchAllDatabases();
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

  const fetchAllDatabases = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/database/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl
        })
      });

      const result = await response.json();

      if (result.success && result.databases) {
        setAllDatabases(result.databases);
      }
    } catch (error) {
      console.error('Failed to fetch all databases:', error);
    }
  };

  const fetchCollectionDetails = async (collectionName) => {
    setIsLoadingCollectionDetails(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/collection/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl,
          database_name: database.name,
          collection_name: collectionName
        })
      });

      const result = await response.json();

      if (result.success && result.collection) {
        setCollectionDetails(result.collection);
      } else {
        setError('Failed to fetch collection details: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      setError('Failed to fetch collection details: ' + error.message);
    } finally {
      setIsLoadingCollectionDetails(false);
    }
  };

  const handleRefresh = () => {
    fetchDatabaseDetails();
    fetchCollections();
    fetchAllDatabases();
  };

  const handleCollectionClick = (collection) => {
    setSelectedCollection(collection);
    setCollectionDetails(null); // Clear previous details
    fetchCollectionDetails(collection.name);
  };

  const handleCopyCollection = async (collection) => {
    setCollectionToCopy(collection);
    // Refresh database list to ensure we have up-to-date data for the modal
    await fetchAllDatabases();
    setShowCopyModal(true);
  };

  const handleCopySuccess = (targetDatabase, newCollectionName) => {
    // Refresh collections to show any updates
    fetchCollections();
    // If copied to the same database, refresh the current view
    if (targetDatabase === database.name) {
      fetchDatabaseDetails();
    }
  };

  const handleCloseCopyModal = () => {
    setShowCopyModal(false);
    setCollectionToCopy(null);
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
                    className={`group p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                      selectedCollection?.name === collection.name
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <DocumentTextIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-sm font-medium truncate transition-colors ${
                            selectedCollection?.name === collection.name
                              ? 'text-blue-700'
                              : 'text-gray-900 group-hover:text-blue-600'
                          }`}>
                            {collection.name}
                          </h3>
                          <p className={`text-xs mt-1 ${
                            selectedCollection?.name === collection.name
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }`}>
                            {selectedCollection?.name === collection.name ? 'Selected Collection' : 'Collection'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCollection(collection);
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
                      <p className={`text-xs text-center ${
                        selectedCollection?.name === collection.name
                          ? 'text-blue-500 font-medium'
                          : 'text-gray-400'
                      }`}>
                        {selectedCollection?.name === collection.name
                          ? 'Collection details shown below'
                          : 'Click to view collection details'
                        }
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

        {/* Collection Details View */}
        {selectedCollection && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <CollectionIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedCollection.name}
                    </h2>
                    <p className="text-sm text-gray-500">Collection Details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCollection(null);
                    setCollectionDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {isLoadingCollectionDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <RefreshIcon className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading collection details...</p>
                  </div>
                </div>
              ) : collectionDetails ? (
                <div className="space-y-6">
                  {/* Collection Statistics */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
                      Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">Documents</p>
                            <p className="text-lg font-bold text-blue-800">
                              {collectionDetails.stats.count.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center">
                          <CubeIcon className="h-6 w-6 text-green-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Data Size</p>
                            <p className="text-lg font-bold text-green-800">
                              {formatBytes(collectionDetails.stats.size)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center">
                          <ViewGridIcon className="h-6 w-6 text-purple-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-purple-900">Storage Size</p>
                            <p className="text-lg font-bold text-purple-800">
                              {formatBytes(collectionDetails.stats.storageSize)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <div className="flex items-center">
                          <KeyIcon className="h-6 w-6 text-orange-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-orange-900">Indexes</p>
                            <p className="text-lg font-bold text-orange-800">
                              {collectionDetails.stats.indexCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Stats */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 border">
                        <p className="text-xs text-gray-500">Average Document Size</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatBytes(collectionDetails.stats.avgObjSize)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border">
                        <p className="text-xs text-gray-500">Total Index Size</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatBytes(collectionDetails.stats.totalIndexSize)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border">
                        <p className="text-xs text-gray-500">Collection Type</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {collectionDetails.stats.capped ? 'Capped' : 'Regular'}
                          {collectionDetails.stats.capped && collectionDetails.stats.maxSize && (
                            <span className="text-xs text-gray-500 ml-1">
                              (Max: {formatBytes(collectionDetails.stats.maxSize)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Indexes */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <TableIcon className="h-5 w-5 mr-2 text-purple-500" />
                      Indexes ({collectionDetails.indexes.length})
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Keys
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Properties
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {collectionDetails.indexes.map((index, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {index.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {JSON.stringify(index.keys)}
                                  </code>
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <div className="flex flex-wrap gap-1">
                                    {index.unique && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Unique
                                      </span>
                                    )}
                                    {index.sparse && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Sparse
                                      </span>
                                    )}
                                    {index.background && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Background
                                      </span>
                                    )}
                                    {index.expireAfterSeconds && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        TTL: {index.expireAfterSeconds}s
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Sample Documents */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <CodeIcon className="h-5 w-5 mr-2 text-green-500" />
                      Sample Documents ({collectionDetails.sampleDocuments.length})
                    </h3>
                    {collectionDetails.sampleDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {collectionDetails.sampleDocuments.map((doc, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <span className="text-xs font-medium text-gray-600">Document {idx + 1}</span>
                            </div>
                            <div className="p-4">
                              <pre className="text-xs text-gray-800 overflow-x-auto bg-gray-50 p-3 rounded border">
                                {JSON.stringify(doc, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No documents found in this collection</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CollectionIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Collection Details</h3>
                  <p className="text-gray-500 mb-4">Unable to fetch details for this collection</p>
                  <button
                    onClick={() => fetchCollectionDetails(selectedCollection.name)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copy Collection Modal */}
      <CopyCollectionModal
        isOpen={showCopyModal}
        onClose={handleCloseCopyModal}
        sourceDatabase={database.name}
        sourceCollection={collectionToCopy?.name}
        connectionString={serverUrl}
        allDatabases={allDatabases}
        onCopySuccess={handleCopySuccess}
      />
    </div>
  );
}

export default DatabaseCard;