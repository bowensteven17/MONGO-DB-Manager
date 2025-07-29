import { useState } from 'react';
import { 
  DatabaseIcon, 
  ServerIcon,
  PlayIcon,
  RefreshIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/outline';

// Import components
import Sidebar from '../components/Sidebar';
import DatabaseCard from '../components/DatabaseCard';
import BackUp from '../components/backup/BackUp';
import Restore from '../components/restore/Restore'
function Main() {
  // Connection state
  const [serverUrl, setServerUrl] = useState('mongodb://localhost:27017');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Databases state
  const [databases, setDatabases] = useState([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  
  // Navigation state for sidebar
  const [activeSection, setActiveSection] = useState('databases');
  
  // Database selection state
  const [selectedDatabase, setSelectedDatabase] = useState(null);

  const handleConnect = async () => {
    if (!serverUrl.trim()) {
      setConnectionError('Please enter a server URL');
      return;
    }

    setIsConnecting(true);
    setConnectionError('');

    try {
      // First test the connection
      const testResponse = await fetch('http://localhost:5000/api/database/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl
        })
      });

      const testResult = await testResponse.json();

      if (!testResult.success) {
        setConnectionError(testResult.message || 'Failed to connect to MongoDB server');
        return;
      }

      // Connection successful, now fetch databases
      setIsConnected(true);
      await fetchDatabases();

    } catch (error) {
      setConnectionError('Failed to connect to server: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchDatabases = async () => {
    setIsLoadingDatabases(true);
    
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
        setDatabases(result.databases);
      } else {
        setConnectionError('Failed to fetch databases: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      setConnectionError('Failed to fetch databases: ' + error.message);
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setDatabases([]);
    setConnectionError('');
    setServerUrl('mongodb://localhost:27017');
    setSelectedDatabase(null); // Reset selected database
  };

  const handleRefreshDatabases = () => {
    fetchDatabases();
    setSelectedDatabase(null); // Reset selection when refreshing
  };

  const handleDatabaseClick = (database) => {
    setSelectedDatabase(database);
  };

  const handleBackToDatabases = () => {
    setSelectedDatabase(null);
  };

  const formatDatabaseSize = (sizeInBytes) => {
    if (!sizeInBytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Step 1: Connection Interface
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <DatabaseIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">MongoDB Explorer</h1>
            <p className="text-gray-300">Connect to your MongoDB server to get started</p>
          </div>

          {/* Connection Form */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center mb-4">
              <ServerIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Server Connection</h2>
            </div>

            <div className="space-y-4">
              {/* Server URL Input */}
              <div>
                <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  MongoDB Server URL
                </label>
                <input
                  type="text"
                  id="serverUrl"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                    setConnectionError('');
                  }}
                  placeholder="mongodb://localhost:27017"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Examples: mongodb://localhost:27017 or mongodb+srv://cluster.mongodb.net
                </p>
              </div>

              {/* Connection Error */}
              {connectionError && (
                <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-md">
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{connectionError}</span>
                </div>
              )}

              {/* Connect Button */}
              <button
                onClick={handleConnect}
                disabled={isConnecting || !serverUrl.trim()}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? (
                  <>
                    <RefreshIcon className="animate-spin h-4 w-4 mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Connect & List Databases
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationCircleIcon className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-yellow-700">
                  <strong>Security:</strong> Connection details are stored only for this session and are not saved permanently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1 Complete: Show Databases List with Sidebar
  return (
    <div className="flex h-screen">
      {/* Sidebar with Navigation */}
      <Sidebar 
        databases={databases}
        serverUrl={serverUrl}
        onDisconnect={handleDisconnect}
        onRefreshDatabases={handleRefreshDatabases}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isLoadingDatabases={isLoadingDatabases}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {activeSection === 'databases' && (
          <div className="bg-gray-50 h-full">
            {selectedDatabase ? (
              // Show DatabaseCard when a database is selected
              <DatabaseCard 
                database={selectedDatabase}
                serverUrl={serverUrl}
                onBack={handleBackToDatabases}
              />
            ) : (
              // Show databases overview when no database is selected
              <>
                {/* Header */}
                <div className="bg-white shadow-sm border-b">
                  <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">Databases Overview</h1>
                        <p className="text-sm text-gray-500 mt-1">
                          Manage your MongoDB databases and collections
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-500">
                          {databases.length} database(s) found
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                  {/* Connection Success Banner */}
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-green-900">Successfully Connected!</h3>
                        <p className="text-sm text-green-700">Ready to explore your MongoDB databases.</p>
                      </div>
                    </div>
                  </div>

                  {/* Databases Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {databases.map((database, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleDatabaseClick(database)}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="p-3 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                              <DatabaseIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{database.name}</h3>
                              <p className="text-sm text-gray-500">Database</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Size:</span>
                            <span className="text-gray-900 font-medium">
                              {formatDatabaseSize(database.sizeOnDisk)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Collections:</span>
                            <span className="text-gray-900 font-medium">
                              {database.collections || 'N/A'}
                            </span>
                          </div>
                          {database.empty !== undefined && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Status:</span>
                              <span className={`font-medium ${database.empty ? 'text-yellow-600' : 'text-green-600'}`}>
                                {database.empty ? 'Empty' : 'Active'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-400 text-center group-hover:text-blue-500 transition-colors">
                            Click to explore collections and details
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State */}
                  {databases.length === 0 && !isLoadingDatabases && (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                      <DatabaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases Found</h3>
                      <p className="text-gray-500 mb-4">
                        Your MongoDB server doesn't have any databases yet.
                      </p>
                      <button
                        onClick={handleRefreshDatabases}
                        className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <RefreshIcon className="h-4 w-4 mr-2" />
                        Refresh List
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

            {activeSection === 'backup' && (
            <BackUp serverUrl={serverUrl} />
            )}

            {activeSection === 'restore' && (
            <Restore 
            serverUrl={serverUrl}
            onRestoreSuccess={fetchDatabases} 
             />
            )}

        {activeSection === 'settings' && (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="p-4 bg-gray-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                <DatabaseIcon className="h-8 w-8 text-gray-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
              <p className="text-gray-500">Application configuration options</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Main;