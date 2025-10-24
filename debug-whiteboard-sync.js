// Debug script to test whiteboard synchronization
import io from 'socket.io-client';

console.log('🧪 Testing Whiteboard Synchronization');
console.log('=====================================');

// Test configuration
const SERVER_URL = 'http://localhost:5001';
const MEETING_ID = '68b08497-2ab5-461e-a7f0-6ad533ba0cf2';
const WHITEBOARD_ID = `wb_${MEETING_ID}`;

// Create two test users
const user1 = {
    id: 'test-user-1',
    displayName: 'Test User 1'
};

const user2 = {
    id: 'test-user-2', 
    displayName: 'Test User 2'
};

let socket1, socket2;
let user1DrawingReceived = false;
let user2DrawingReceived = false;

// Test function to check synchronization
function testWhiteboardSync() {
    return new Promise((resolve, reject) => {
        console.log('\n📡 Connecting User 1...');
        
        // Connect User 1
        socket1 = io(`${SERVER_URL}/whiteboard`);
        
        socket1.on('connect', () => {
            console.log('✅ User 1 connected');
            
            // Join whiteboard
            socket1.emit('join-whiteboard', {
                whiteboardId: WHITEBOARD_ID,
                userId: user1.id,
                meetingId: MEETING_ID,
                displayName: user1.displayName
            });
        });

        socket1.on('joined-whiteboard', (data) => {
            console.log('✅ User 1 joined whiteboard:', data);
            
            // Connect User 2
            console.log('\n📡 Connecting User 2...');
            socket2 = io(`${SERVER_URL}/whiteboard`);
            
            socket2.on('connect', () => {
                console.log('✅ User 2 connected');
                
                socket2.emit('join-whiteboard', {
                    whiteboardId: WHITEBOARD_ID,
                    userId: user2.id,
                    meetingId: MEETING_ID,
                    displayName: user2.displayName
                });
            });

            socket2.on('joined-whiteboard', (data) => {
                console.log('✅ User 2 joined whiteboard:', data);
                
                // Set up drawing listeners
                setupDrawingListeners();
                
                // Start drawing test after 1 second
                setTimeout(() => {
                    testDrawingSync();
                }, 1000);
            });
        });

        function setupDrawingListeners() {
            // User 1 listens for User 2's drawings
            socket1.on('drawing-start', (data) => {
                if (data.userId === user2.id) {
                    console.log('👁️ User 1 received User 2 drawing-start');
                }
            });

            socket1.on('drawing', (data) => {
                if (data.userId === user2.id) {
                    console.log('👁️ User 1 received User 2 drawing update');
                    user2DrawingReceived = true;
                }
            });

            socket1.on('drawing-end', (data) => {
                if (data.userId === user2.id) {
                    console.log('👁️ User 1 received User 2 drawing-end');
                }
            });

            // User 2 listens for User 1's drawings
            socket2.on('drawing-start', (data) => {
                if (data.userId === user1.id) {
                    console.log('👁️ User 2 received User 1 drawing-start');
                }
            });

            socket2.on('drawing', (data) => {
                if (data.userId === user1.id) {
                    console.log('👁️ User 2 received User 1 drawing update');
                    user1DrawingReceived = true;
                }
            });

            socket2.on('drawing-end', (data) => {
                if (data.userId === user1.id) {
                    console.log('👁️ User 2 received User 1 drawing-end');
                }
            });
        }

        function testDrawingSync() {
            console.log('\n🎨 Testing Drawing Synchronization...');
            
            // User 1 starts drawing
            console.log('🖊️ User 1 starts drawing...');
            socket1.emit('drawing-start', {
                x: 100,
                y: 100,
                tool: 'pen',
                color: '#000000',
                brushSize: 3,
                timestamp: Date.now()
            });

            // User 1 draws a few points
            setTimeout(() => {
                socket1.emit('drawing', {
                    x: 150,
                    y: 150,
                    tool: 'pen',
                    color: '#000000',
                    brushSize: 3,
                    timestamp: Date.now()
                });
            }, 100);

            setTimeout(() => {
                socket1.emit('drawing-end', {
                    elementData: {
                        type: 'canvasState',
                        tool: 'pen',
                        color: '#000000',
                        brushSize: 3,
                        timestamp: Date.now(),
                        imageData: 'data:image/png;base64,test-data'
                    },
                    timestamp: Date.now()
                });
            }, 200);

            // User 2 starts drawing after a delay
            setTimeout(() => {
                console.log('🖊️ User 2 starts drawing...');
                socket2.emit('drawing-start', {
                    x: 200,
                    y: 200,
                    tool: 'pen',
                    color: '#ff0000',
                    brushSize: 5,
                    timestamp: Date.now()
                });

                setTimeout(() => {
                    socket2.emit('drawing', {
                        x: 250,
                        y: 250,
                        tool: 'pen',
                        color: '#ff0000',
                        brushSize: 5,
                        timestamp: Date.now()
                    });
                }, 100);

                setTimeout(() => {
                    socket2.emit('drawing-end', {
                        elementData: {
                            type: 'canvasState',
                            tool: 'pen',
                            color: '#ff0000',
                            brushSize: 5,
                            timestamp: Date.now(),
                            imageData: 'data:image/png;base64,test-data-2'
                        },
                        timestamp: Date.now()
                    });
                }, 200);
            }, 500);

            // Check results after all drawing is done
            setTimeout(() => {
                console.log('\n📊 Test Results:');
                console.log('================');
                console.log(`User 1 received User 2's drawing: ${user2DrawingReceived ? '✅ YES' : '❌ NO'}`);
                console.log(`User 2 received User 1's drawing: ${user1DrawingReceived ? '✅ YES' : '❌ NO'}`);
                
                if (user1DrawingReceived && user2DrawingReceived) {
                    console.log('\n🎉 SUCCESS: Real-time synchronization is working!');
                } else {
                    console.log('\n❌ FAILURE: Real-time synchronization has issues');
                }

                // Test view switching simulation
                testViewSwitching();
            }, 2000);
        }

        function testViewSwitching() {
            console.log('\n🔄 Testing View Switching...');
            
            // Simulate user disconnecting (view switch)
            console.log('📤 User 1 disconnecting (simulating view switch)...');
            socket1.disconnect();

            setTimeout(() => {
                console.log('📥 User 1 reconnecting after view switch...');
                socket1 = io(`${SERVER_URL}/whiteboard`);
                
                socket1.on('connect', () => {
                    socket1.emit('join-whiteboard', {
                        whiteboardId: WHITEBOARD_ID,
                        userId: user1.id,
                        meetingId: MEETING_ID,
                        displayName: user1.displayName
                    });
                });

                socket1.on('joined-whiteboard', (data) => {
                    console.log('✅ User 1 rejoined after view switch');
                });

                socket1.on('whiteboard-state', (data) => {
                    console.log('📋 User 1 received whiteboard state after reconnection:', {
                        hasElements: data.elements && data.elements.length > 0,
                        elementCount: data.elements ? data.elements.length : 0,
                        hasCanvasState: !!data.canvasState,
                        version: data.version
                    });
                });

                setTimeout(() => {
                    console.log('\n✅ View switching test completed');
                    cleanup();
                    resolve();
                }, 2000);
            }, 1000);
        }

        function cleanup() {
            console.log('\n🧹 Cleaning up connections...');
            if (socket1) socket1.disconnect();
            if (socket2) socket2.disconnect();
        }

        // Handle errors
        socket1.on('error', (error) => {
            console.error('❌ Socket1 error:', error);
            cleanup();
            reject(error);
        });

        setTimeout(() => {
            console.log('⏰ Test timeout after 15 seconds');
            cleanup();
            resolve();
        }, 15000);
    });
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testWhiteboardSync()
        .then(() => {
            console.log('\n🏁 Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}

export { testWhiteboardSync };