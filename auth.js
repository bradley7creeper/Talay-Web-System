import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZigEM8iERq3OnJc18r-9ifKLmeMVszi4",
    authDomain: "sia101-activity2-talay-cf1f8.firebaseapp.com",
    projectId: "sia101-activity2-talay-cf1f8",
    storageBucket: "sia101-activity2-talay-cf1f8.appspot.com",
    messagingSenderId: "22283593267",
    appId: "1:22283593267:web:fd54a946e6a48704f02546"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const webhookUrl = 'https://webhook.site/268031c8-6b43-4d19-9422-fe50feffee9c';

// Initialize an array to store search history
let searchHistory = [];

// Function to send webhook notification
function sendWebhookNotification(action, data) {
    const timestamp = new Date().toISOString();

    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, timestamp, ...data }),
    }).catch(error => console.error('Error sending webhook notification:', error));
}

// Function to fetch notifications
async function fetchNotifications() {
    try {
        const response = await fetch(webhookUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error("Failed to fetch notifications");

        const notifications = await response.json();
        console.log('Fetched notifications:', notifications);

        if (notifications.status === 'SUCCESS' && Array.isArray(notifications.data)) {
            displayNotifications(notifications.data);
        } else {
            console.warn('No notifications available or unexpected format:', notifications);
            displayNotifications([]);
        }
    } catch (error) {
        console.error("Error fetching notifications:", error);
    }
}

// Display notifications in the panel
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    if (notificationsList) {
        notificationsList.innerHTML = ''; // Clear previous notifications

        notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = 'notification-item';
            notificationItem.innerHTML = `
                <p><strong>Action:</strong> ${notification.action || 'N/A'}</p>
                <p><strong>Location:</strong> ${notification.query || "N/A"}</p>
                <p><strong>Coordinates:</strong> Lat: ${notification.lat || 'N/A'}, Lon: ${notification.lon || 'N/A'}</p>
                <p><strong>Timestamp:</strong> ${new Date(notification.timestamp).toLocaleString()}</p>
            `;
            notificationsList.appendChild(notificationItem);
        });
    }
}

// Toggle the notification panel visibility
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

// Initialize the map and set up search functionality
function initMap() {
    const map = L.map('map').setView([10.920, 120.526], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const searchButton = document.getElementById('searchButton');
    const searchBar = document.getElementById('searchBar');

    const performSearch = () => {
        const query = searchBar.value.trim();
        if (!query) {
            alert("Please enter a location to search.");
            return;
        }

        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const { lat, lon } = data[0];
                    map.setView([lat, lon], 13);
                    L.marker([lat, lon]).addTo(map)
                        .bindPopup(`${query} - Latitude: ${lat}, Longitude: ${lon}`)
                        .openPopup();

                    // Send the search action to webhook
                    sendWebhookNotification('search', { query, lat, lon });

                    // Store the search in searchHistory
                    searchHistory.push({
                        action: 'search',
                        query,
                        lat,
                        lon,
                        timestamp: new Date().toISOString()
                    });

                    // Update notifications list immediately
                    displayNotifications(searchHistory);
                } else {
                    alert('Location not found.');
                }
            })
            .catch(error => alert("Error fetching location."));
    };

    if (searchButton && searchBar) {
        searchButton.onclick = performSearch;
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}

// Set up map initialization on the correct page
if (window.location.pathname.includes('map.html')) {
    document.addEventListener('DOMContentLoaded', initMap);
}

// Login form submission handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                alert('Login successful!');
                sendWebhookNotification('login', { email });
                window.location.href = 'map.html';
            })
            .catch((error) => alert(error.message));
    });
}

// Registration form submission handler
const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password === confirmPassword) {
            createUserWithEmailAndPassword(auth, email, password)
                .then(() => {
                    alert('Registration successful!');
                    sendWebhookNotification('registration', { username, email });
                    window.location.href = 'map.html';
                })
                .catch((error) => alert(error.message));
        } else {
            alert('Passwords do not match.');
        }
    });
}

// Set up the notification icon click event to toggle the panel and fetch notifications
const notificationIcon = document.getElementById('notificationIcon');
if (notificationIcon) {
    notificationIcon.addEventListener('click', () => {
        toggleNotificationPanel();
        displayNotifications(searchHistory); // Show current search history
    });
}
