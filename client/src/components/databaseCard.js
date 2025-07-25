import { useState, useEffect } from 'react';
import {
  DatabaseIcon,
  DocumentTextIcon,
  CubeIcon,
  ClockIcon,
  ChartBarIcon,
  KeyIcon,
  EyeIcon,
  CollectionIcon,
} from '@heroicons/react/outline';

function DatabaseCard({ databaseName, collectionName }) {
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectionString = "mongodb://localhost:27017"; // You might want to get this from context/props

  useEffect(() => {
    if (databaseName && collectionName) {
      fetchCollectionDetails();
    }
  }, [databaseName, collectionName]);

  const fetchCollectionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('http://localhost:5000/api/collection/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_string: connectionString,
          database_name: databaseName,
          collection_name: collectionName
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Collection Details:', data);
      
      if (data.success) {
        setCollectionDetails(data.collection);
      } else {
        throw new Error('Failed to fetch collection details');
      }
    } catch (error) {
      console.error('Failed to fetch collection details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading collection details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Collection</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!collectionDetails) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Collection Selected</h3>
        <p className="mt-1 text-sm text-gray-500">Select a collection from the sidebar to view its details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{collectionDetails.name}</h1>
              <p className="text-sm text-gray-500">
                Database: <span className="font-medium">{collectionDetails.database}</span>
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <EyeIcon className="h-4 w-4 mr-2" />
              View Documents
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Documents</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(collectionDetails.stats.count)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Data Size</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatBytes(collectionDetails.stats.size)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Storage Size</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatBytes(collectionDetails.stats.storageSize)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <KeyIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Indexes</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {collectionDetails.stats.indexCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Collection Information</h3>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Average Object Size</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatBytes(collectionDetails.stats.avgObjSize)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Index Size</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatBytes(collectionDetails.stats.totalIndexSize)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Capped Collection</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {collectionDetails.stats.capped ? 'Yes' : 'No'}
              </dd>
            </div>
            {collectionDetails.stats.capped && collectionDetails.stats.maxSize && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Max Size</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatBytes(collectionDetails.stats.maxSize)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Indexes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Indexes</h3>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keys
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sparse
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collectionDetails.indexes.map((index, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {JSON.stringify(index.keys)}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      index.unique ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {index.unique ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      index.sparse ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {index.sparse ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Documents */}
      {collectionDetails.sampleDocuments && collectionDetails.sampleDocuments.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Sample Documents</h3>
            <p className="mt-1 text-sm text-gray-500">First 5 documents from the collection</p>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {collectionDetails.sampleDocuments.map((doc, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatabaseCard;