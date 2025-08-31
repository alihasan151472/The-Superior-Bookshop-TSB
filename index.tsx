/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";
import { Chart } from "chart.js/auto";

// 1. --- INITIALIZATION AND STATE ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const root = document.getElementById("root")!;
let financeChartInstances: { [key: string]: Chart } = {};

const permissions = {
    'dashboard:view': 'View main dashboard',
    'inventory:view': 'View inventory list',
    'inventory:add': 'Add new books to inventory',
    'inventory:edit': 'Edit existing book details',
    'inventory:delete': 'Delete books from inventory',
    'finance:view_dashboard': 'View finance dashboard (revenue, expenses)',
    'finance:manage_expenses': 'Add, edit, and delete expenses',
    'finance:receive_sales': 'Receive and verify daily sales from cashiers',
    'finance:run_reports': 'Generate and export financial reports',
    'frontdesk:view': 'View printing orders',
    'frontdesk:create_order': 'Create new print orders',
    'frontdesk:update_status': 'Update status of print orders',
    'pos:use': 'Use the Point of Sale system',
    'photocopy:use': 'Use the Photocopy module',
    'admin:view': 'Access the Admin Panel',
    'admin:manage_users': 'Add, edit, and delete users',
    'admin:manage_roles': 'Create, edit, and delete roles and permissions',
    'admin:manage_print_settings': 'Manage printing service settings',
    'admin:manage_payment_gateways': 'Manage payment gateways',
    'admin:manage_app_settings': 'Manage general application settings',
    'admin:manage_invoice_settings': 'Customize sales invoices',
    'admin:manage_pos_settings': 'Customize Point of Sale settings',
    'admin:manage_returns': 'Approve or reject item return requests',
    'admin:view_audit_log': 'View the system audit log',
    'student:view': 'View student list',
    'student:add': 'Add new students',
    'student:edit': 'Edit student profiles',
    'student:delete': 'Delete students',
};

// Mock data for a full-featured application
const state = {
    currentView: 'login', // 'login', 'signup', 'app'
    activeModule: 'dashboard', // 'dashboard', 'inventory', 'finance', 'frontdesk', 'admin', 'students'

    inventory: {
        "9780545010221": { name: "Harry Potter and the Deathly Hallows", price: 1899, stock: 15 },
        "9780321765723": { name: "The Lord of the Rings", price: 2599, stock: 4 },
        "9780743273565": { name: "The Great Gatsby", price: 1250, stock: 25 },
        "9781982137233": { name: "Atomic Habits", price: 1620, stock: 3 },
        "9781400079179": { name: "The Catcher in the Rye", price: 999, stock: 0 },
    },
    pos: {
        cart: [] as { name: string, price: number, isbn: string, quantity: number }[],
        isScanning: false,
        videoStream: null as MediaStream | null,
        completedSales: [] as any[], // To track revenue. Will include POS and Photocopy sales.
        refunds: [] as any[], // To track approved refunds
        manualSearchQuery: '',
        manualSearchResults: [] as any[],
        currentInvoice: null as (any & { isFinalized?: boolean }) | null,
        selectedStudent: null as { id: number, name: string } | null,
        studentSearchQuery: '',
        studentSearchResults: [] as any[],
        discount: 0,
        taxRate: 0, // As a percentage, e.g., 5 for 5%
        manualCustomerName: '',
        activeTab: 'new_sale', // 'new_sale', 'history', 'service_center'
        historyStartDate: new Date().toISOString().split('T')[0], // Default to today
        historyEndDate: new Date().toISOString().split('T')[0], // Default to today
        adjustmentModalData: null as { sale: any, type: 'return' | 'cancel' | 'adjustDiscount' } | null,
        showClosureModal: false,
        closurePreview: null as any,
    },
    photocopy: {
        serviceType: 'photocopy', // 'photocopy', 'scan', 'id_card'
        // All fields for all services are here, UI will show/hide them
        bwPages: 0,
        colorPages: 0,
        copies: 1,
        paperSize: 'a4',
        paperType: 'standard',
        isDuplex: false,
        isBorderless: false,
        scanPages: 1,
        scanFormat: 'pdf',
        emailTo: '',
        idCardCount: 1,
        idCardLaminated: true,
        finishingLamination: false, // For photocopying pages
        finishingStaple: false,
        isUrgent: false,
        manualCustomerName: '',
        currentInvoice: null as (any & { isFinalized?: boolean, type: 'photocopy' }) | null,
    },
    printing: {
        step: 'details', // 'details', 'payment', 'confirmation'
        orderDetails: null as any,
        selectedPaymentMethod: null as any,
        studentSearchQuery: '',
        studentSearchResults: [],
        selectedStudentId: null as number | null,
    },
    printOrders: [] as any[],
    auth: {
        isLoggedIn: false,
        user: null as { id: number; name: string; email: string; roleId: string; permissions: string[] } | null,
        loginError: null as string | null,
        signupError: null as string | null,
    },
    admin: {
        currentView: 'users', // users, returns, settings, print_service, payment_gateways, invoice_settings, pos_settings, photocopy_settings, audit_log
        activeUsersTab: 'users', // 'users' or 'roles'
        editingInventoryId: null as string | null,
        editingUserId: null as number | null,
        editingRoleId: null as string | null,
        editingStudentId: null as number | null,
        auditLogFilterUserId: '',
        auditLogFilterStartDate: '',
        auditLogFilterEndDate: '',
    },
    users: [
        { id: 1, name: 'Admin User', email: 'admin@bookshop.com', password: 'password', roleId: 'admin' },
        { id: 2, name: 'Manager User', email: 'manager@bookshop.com', password: 'password', roleId: 'manager' },
        { id: 3, name: 'Finance User', email: 'finance@bookshop.com', password: 'password', roleId: 'finance' },
        { id: 4, name: 'Front Desk User', email: 'frontdesk@bookshop.com', password: 'password', roleId: 'frontdesk' },
        { id: 5, name: 'Cashier User', email: 'cashier@bookshop.com', password: 'password', roleId: 'cashier' },
    ],
    students: [
        { id: 101, name: 'Alice Johnson', email: 'alice@example.com', phone: '111-222-3333', photo: '' },
        { id: 102, name: 'Bob Williams', email: 'bob@example.com', phone: '444-555-6666', photo: '' },
    ],
    permissions,
    roles: [
        { id: 'admin', name: 'Admin', permissions: Object.keys(permissions) },
        { id: 'manager', name: 'Manager', permissions: [
            'dashboard:view', 'inventory:view', 'inventory:add', 'inventory:edit',
            'finance:view_dashboard', 'frontdesk:view', 'frontdesk:create_order', 'frontdesk:update_status', 'pos:use',
            'admin:view', 'admin:manage_print_settings', 'admin:manage_app_settings', 'admin:manage_invoice_settings', 'admin:manage_pos_settings',
            'student:view', 'student:add', 'student:edit', 'student:delete',
        ]},
        { id: 'finance', name: 'Finance', permissions: ['dashboard:view', 'finance:view_dashboard', 'finance:manage_expenses', 'finance:receive_sales', 'finance:run_reports'] },
        { id: 'frontdesk', name: 'Front Desk', permissions: ['dashboard:view', 'frontdesk:view', 'frontdesk:create_order', 'frontdesk:update_status', 'photocopy:use'] },
        { id: 'cashier', name: 'Cashier', permissions: ['dashboard:view', 'pos:use'] },
    ],
    finance: {
        activeTab: 'overview', // 'overview', 'closures', 'expenses', 'reporting'
        reportStartDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Default to last 30 days
        reportEndDate: new Date().toISOString().split('T')[0], // Default to today
        viewingClosure: null as any | null, // The closure object being viewed in the modal
        closureFilterStartDate: '',
        closureFilterEndDate: '',
        closureFilterUserId: '',
        closureFilterSearchQuery: '',
        editingExpenseId: null as string | null,
        expenseFilterStartDate: '',
        expenseFilterEndDate: '',
        expenseFilterUserId: '',
        expenseFilterSearchQuery: '',
        expenses: [
            { id: 'exp1', date: '2024-05-01', category: 'Rent', amount: 150000, description: 'Monthly office rent', userId: 1, userName: 'Admin User' },
            { id: 'exp2', date: '2024-05-05', category: 'Supplies', amount: 35000, description: 'Paper and ink purchase', userId: 2, userName: 'Manager User' },
            { id: 'exp3', date: '2024-05-15', category: 'Utilities', amount: 25000, description: 'Electricity and Internet', userId: 3, userName: 'Finance User' },
        ],
        dailyClosures: [] as {
            id: string;
            date: string; // YYYY-MM-DD
            userId: number;
            userName: string;
            totalSales: number;
            salesCount: number;
            totalRefunds: number;
            refundsCount: number;
            salesInvoices: any[]; // Store the actual invoices
            refundInvoices: any[]; // Store the refund invoices
            status: 'Pending' | 'Received';
        }[]
    },
    returns: [] as any[],
    settings: {
        shopName: 'The Superior Bookshop',
        theme: {
            primaryColor: '#0d47a1',
        },
        modules: {
            dashboard: { enabled: true, name: 'Dashboard' },
            inventory: { enabled: true, name: 'Inventory' },
            students: { enabled: true, name: 'Students' },
            finance: { enabled: true, name: 'Finance' },
            frontdesk: { enabled: true, name: 'Front Desk' },
            pos: { enabled: true, name: 'Point of Sale' },
            photocopy: { enabled: true, name: 'Service Center' },
            admin: { enabled: true, name: 'Admin Panel' },
        },
        invoiceSettings: {
            logoUrl: '',
            footerText: 'Thank you for your business!',
            showShopName: true,
            showInvoiceId: true,
            showDate: true,
            showBilledTo: true,
        },
        posSettings: {
            lowStockThreshold: 5,
            defaultTaxRate: 0,
            allowBarcodeScanning: true,
            allowManualSearch: true,
            allowCustomerSelection: true,
        },
        photocopySettings: {
            paperSizes: [
                { id: 'a4', name: 'A4', bwPrice: 5, colorPrice: 15 },
                { id: 'a3', name: 'A3', bwPrice: 10, colorPrice: 30 },
                { id: 'legal', name: 'Legal', bwPrice: 7, colorPrice: 20 },
            ],
            paperTypes: [
                { id: 'standard', name: 'Standard', extraCost: 0 },
                { id: 'glossy', name: 'Glossy', extraCost: 5 },
                { id: 'matte', name: 'Matte', extraCost: 3 },
            ],
            serviceCosts: {
                scanPerPage: 2,
                idCard: 50,
                laminationPerPage: 10,
                staplePerSet: 1,
                urgentFee: 50,
            }
        },
        printSettings: {
            perPage: { bw: 10, color: 50 },
            paperSizes: [ { id: 'a4', name: 'A4' }, { id: 'a3', name: 'A3' }, { id: 'legal', name: 'Legal' } ],
            paperTypes: [ { id: 'standard', name: 'Standard', extraCost: 0 }, { id: 'glossy', name: 'Glossy', extraCost: 5 }, { id: 'matte', name: 'Matte', extraCost: 3 } ],
            bindingTypes: [ { id: 'none', name: 'None', cost: 0 }, { id: 'staple', name: 'Staple', cost: 100 }, { id: 'spiral', name: 'Spiral Binding', cost: 500 }, { id: 'thermal', name: 'Thermal Binding', cost: 750 } ],
        },
    },
    paymentGateways: [
        { id: 'bank', name: 'Bank Transfer', enabled: true, isTestMode: false, apiKey: '', secretKey: '', details: '<h4>Bank Transfer</h4><p><strong>Bank:</strong> Superior Bank Ltd.</p><p><strong>Account:</strong> The Superior Bookshop</p><p><strong>IBAN:</strong> 0123 4567 8901 2345</p>' },
        { id: 'jazzcash', name: 'JazzCash', enabled: true, isTestMode: false, apiKey: 'JC12345', secretKey: 'SECRET_JAZZ', details: '<h4>JazzCash</h4><p><strong>Account:</strong> The Superior Bookshop</p><p><strong>Number:</strong> 0300 1234567</p>' },
        { id: 'stripe', name: 'Credit/Debit Card (Stripe)', enabled: false, isTestMode: true, apiKey: 'pk_test_...', secretKey: 'sk_test_...', details: '<h4>Pay with Card</h4><p>Secure payments processed by Stripe.</p>' },
    ],
    printMaterialInventory: { paperA4: 10000, paperA3: 5000, inkBlack: 80, inkColor: 75, },
    auditLog: [] as {
        timestamp: string;
        userId: number;
        userName: string;
        action: string;
        details: string;
    }[],
};

// 2. --- GEMINI API & PERMISSION HELPER ---
async function getSummaryFromContent(text: string): Promise<string> {
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Summarize the following document content for a print shop manager. Be brief and highlight the main topic. Document content: "${text.substring(0, 5000)}"`,
            config: { temperature: 0.2 }
        });
        return result.text;
    } catch (error) {
        console.error("Error generating summary:", error);
        return "Could not generate summary.";
    }
}
function userHasPermission(permission: string): boolean {
    return state.auth.user?.permissions?.includes(permission) ?? false;
}

function logUserActivity(action: string, details: string) {
    if (!state.auth.user) return; // Should not happen if user is performing actions

    state.auditLog.unshift({ // unshift to add to the top, making recent logs appear first
        timestamp: new Date().toISOString(),
        userId: state.auth.user.id,
        userName: state.auth.user.name,
        action,
        details,
    });
}


// 3. --- AUTH & PRE-APP RENDER FUNCTIONS ---
function renderLoginView() {
    return `
    <div class="auth-container">
        <div class="card auth-card">
            <h2>Welcome Back!</h2>
            <p>Please log in to access the portal.</p>
            <form id="login-form">
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" value="admin@bookshop.com" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" value="password" required>
                </div>
                ${state.auth.loginError ? `<p class="error-message">${state.auth.loginError}</p>` : ''}
                <button type="submit" class="button">Login</button>
            </form>
            <p class="auth-switch">Don't have an account? <a href="#" id="show-signup">Sign Up</a></p>
        </div>
    </div>
    `;
}

function renderSignupView() {
     return `
    <div class="auth-container">
        <div class="card auth-card">
            <h2>Create an Account</h2>
            <p>Sign up to use the bookshop services.</p>
            <form id="signup-form">
                 <div class="form-group">
                    <label for="name">Full Name</label>
                    <input type="text" id="name" required>
                </div>
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required>
                </div>
                 ${state.auth.signupError ? `<p class="error-message">${state.auth.signupError}</p>` : ''}
                <button type="submit" class="button">Sign Up</button>
            </form>
            <p class="auth-switch">Already have an account? <a href="#" id="show-login">Log In</a></p>
        </div>
    </div>
    `;
}


// 4. --- POST-LOGIN APP RENDER FUNCTIONS ---
function renderAppView() {
    const userRole = state.roles.find(r => r.id === state.auth.user!.roleId);

    const moduleNavButtons = [
        { key: 'dashboard', name: 'Dashboard', permission: 'dashboard:view' },
        { key: 'inventory', name: 'Inventory', permission: 'inventory:view' },
        { key: 'students', name: 'Students', permission: 'student:view' },
        { key: 'finance', name: 'Finance', permission: 'finance:view_dashboard' },
        { key: 'frontdesk', name: 'Front Desk', permission: 'frontdesk:view' },
        { key: 'pos', name: 'Point of Sale', permission: 'pos:use' },
        { key: 'admin', name: 'Admin Panel', permission: 'admin:view' },
    ]
    .filter(module => state.settings.modules[module.key as keyof typeof state.settings.modules]?.enabled && userHasPermission(module.permission))
    .map(module => `<button class="app-nav-button ${state.activeModule === module.key ? 'active' : ''}" data-module="${module.key}">${state.settings.modules[module.key as keyof typeof state.settings.modules].name}</button>`)
    .join('');

    let moduleContent;
    switch(state.activeModule) {
        case 'inventory': moduleContent = renderInventoryView(); break;
        case 'students': moduleContent = renderStudentsView(); break;
        case 'finance': moduleContent = renderFinanceView(); break;
        case 'frontdesk': moduleContent = renderFrontDeskView(); break;
        case 'pos': moduleContent = renderPOSView(); break;
        case 'admin': moduleContent = renderAdminView(); break;
        case 'dashboard':
        default: moduleContent = renderDashboardView();
    }
    
    const adjustmentModal = state.pos.adjustmentModalData ? renderAdjustmentModal(state.pos.adjustmentModalData) : '';
    const closureModal = state.pos.showClosureModal ? renderClosureModal(state.pos.closurePreview) : '';
    const financeClosureModal = state.finance.viewingClosure ? renderFinanceClosureDetailModal(state.finance.viewingClosure) : '';

    return `
        <header class="app-header">
            <h1>${state.settings.shopName}</h1>
            <div class="header-user-info">
                 <span>Welcome, <strong>${state.auth.user!.name}</strong> (${userRole?.name || 'No Role'})</span>
                 <button class="button-small secondary" id="logout-btn">Logout</button>
            </div>
        </header>
        <div class="app-body">
            <nav class="app-sidebar">
                ${moduleNavButtons}
            </nav>
            <main class="app-main-content">
                ${moduleContent}
            </main>
        </div>
        ${adjustmentModal}
        ${closureModal}
        ${financeClosureModal}
    `;
}

function renderDashboardView() {
    const moduleCards = {
        inventory: { content: `<div class="dashboard-card" data-module="inventory"><h3><i class="icon">📚</i>Book Inventory</h3><p>Manage book stock, prices, and details.</p></div>`, permission: 'inventory:view' },
        students: { content: `<div class="dashboard-card" data-module="students"><h3><i class="icon">🎓</i>Students</h3><p>Manage student profiles and records.</p></div>`, permission: 'student:view' },
        finance: { content: `<div class="dashboard-card" data-module="finance"><h3><i class="icon">💰</i>Finance</h3><p>Track revenue, expenses, and view reports.</p></div>`, permission: 'finance:view_dashboard' },
        frontdesk: { content: `<div class="dashboard-card" data-module="frontdesk"><h3><i class="icon">🖨️</i>Front Desk</h3><p>Manage printing orders and customer inquiries.</p></div>`, permission: 'frontdesk:view' },
        pos: { content: `<div class="dashboard-card" data-module="pos"><h3><i class="icon">🛒</i>Point of Sale</h3><p>Process customer sales and scan items.</p></div>`, permission: 'pos:use' },
        photocopy: { content: `<div class="dashboard-card" data-module="pos" onclick="state.pos.activeTab = 'service_center';"><h3><i class="icon">📄</i>Service Center</h3><p>Process photocopy, scanning, and other services.</p></div>`, permission: 'photocopy:use' },
        admin: { content: `<div class="dashboard-card" data-module="admin"><h3><i class="icon">⚙️</i>Admin Panel</h3><p>Manage users, roles, and system settings.</p></div>`, permission: 'admin:view' },
    };
    
    return `
        <h2>Dashboard</h2>
        <div class="dashboard-grid">
            ${Object.entries(moduleCards)
                .filter(([key, card]) => state.settings.modules[key as keyof typeof state.settings.modules]?.enabled && userHasPermission(card.permission))
                .map(([key, card]) => card.content)
                .join('')}
        </div>
    `;
}

function renderInventoryView() {
    const inventoryItems = Object.entries(state.inventory).map(([isbn, item]) => `
        <tr>
            <td>${isbn}</td><td>${item.name}</td><td>Rs ${item.price.toFixed(2)}</td><td>${item.stock}</td>
            <td>
                ${userHasPermission('inventory:edit') ? `<button class="button-small" data-edit-inventory="${isbn}">Edit</button>` : ''}
                ${userHasPermission('inventory:delete') ? `<button class="button-small secondary" data-delete-inventory="${isbn}">Delete</button>` : ''}
            </td>
        </tr>`).join('');
    const editingItem = state.admin.editingInventoryId ? state.inventory[state.admin.editingInventoryId] : null;
    return `
        <h2>Book Inventory Management</h2>
        ${userHasPermission('inventory:add') ? `
        <div class="card">
            <h3>${editingItem ? 'Edit Book' : 'Add New Book'}</h3>
            <form id="inventory-form" data-editing-id="${state.admin.editingInventoryId || ''}">
                <div class="form-grid">
                    <div class="form-group"><label for="isbn">ISBN</label><input type="text" id="isbn" value="${state.admin.editingInventoryId || ''}" ${editingItem ? 'readonly' : ''} required></div>
                    <div class="form-group"><label for="bookName">Book Name</label><input type="text" id="bookName" value="${editingItem?.name || ''}" required></div>
                    <div class="form-group"><label for="price">Price</label><input type="number" id="price" step="0.01" value="${editingItem?.price || ''}" required></div>
                    <div class="form-group"><label for="stock">Stock</label><input type="number" id="stock" value="${editingItem?.stock || ''}" required></div>
                </div>
                <button type="submit" class="button">${editingItem ? 'Update Book' : 'Add Book'}</button>
                ${editingItem ? '<button type="button" class="button secondary" id="cancel-edit-inventory">Cancel Edit</button>' : ''}
            </form>
        </div>` : ''}
        <div class="card">
            <h3>Current Inventory</h3>
            <table class="data-table">
                <thead><tr><th>ISBN</th><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>${inventoryItems}</tbody>
            </table>
        </div>`;
}

function renderStudentsView() {
    const editingStudent = state.admin.editingStudentId ? state.students.find(s => s.id === state.admin.editingStudentId) : null;
    const studentRows = state.students.map(student => `
        <tr>
            <td><img src="${student.photo || 'https://via.placeholder.com/40'}" alt="${student.name}" class="student-photo-avatar"></td>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.phone}</td>
            <td>
                ${userHasPermission('student:edit') ? `<button class="button-small" data-edit-student-id="${student.id}">Edit</button>` : ''}
                ${userHasPermission('student:delete') ? `<button class="button-small" data-delete-student-id="${student.id}">Delete</button>` : ''}
            </td>
        </tr>
    `).join('');

    return `
        <h2>Student Management</h2>
        ${userHasPermission('student:add') ? `
        <div class="card">
            <h3>${editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
            <form id="student-form" data-editing-id="${state.admin.editingStudentId || ''}">
                <div class="form-grid">
                    <div class="form-group"><label for="studentName">Full Name</label><input type="text" id="studentName" value="${editingStudent?.name || ''}" required></div>
                    <div class="form-group"><label for="studentEmail">Email</label><input type="email" id="studentEmail" value="${editingStudent?.email || ''}" required></div>
                    <div class="form-group"><label for="studentPhone">Phone</label><input type="tel" id="studentPhone" value="${editingStudent?.phone || ''}" required></div>
                    <div class="form-group"><label for="studentPhoto">Photo URL</label><input type="text" id="studentPhoto" value="${editingStudent?.photo || ''}"></div>
                </div>
                <button type="submit" class="button">${editingStudent ? 'Update Student' : 'Add Student'}</button>
                ${editingStudent ? '<button type="button" class="button secondary" id="cancel-edit-student">Cancel Edit</button>' : ''}
            </form>
        </div>` : ''}
        <div class="card">
            <h3>All Students</h3>
            <table class="data-table">
                <thead><tr><th>Photo</th><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
                <tbody>${studentRows}</tbody>
            </table>
        </div>
    `;
}

function calculateFinancialSummary(startDate?: string, endDate?: string) {
    // This function implements accrual-based accounting for financial reports.
    // Revenue and refunds are attributed to the original transaction date, not the cash settlement date.
    
    // We only consider data from closures that have been verified by finance.
    const receivedClosures = state.finance.dailyClosures.filter(c => c.status === 'Received');

    let totalRevenue = 0;
    let totalRefunds = 0;
    const salesInPeriod: any[] = [];
    const refundsInPeriod: any[] = [];

    // Get all sales invoices and refund invoices from all received closures
    const allSales = receivedClosures.flatMap(c => c.salesInvoices);
    const allRefunds = receivedClosures.flatMap(c => c.refundInvoices || []);

    // 1. Calculate Revenue based on the actual sale date
    for (const sale of allSales) {
        if (!startDate || !endDate) {
            totalRevenue += sale.total;
            salesInPeriod.push(sale);
        } else {
            const saleDate = new Date(sale.date).toISOString().split('T')[0];
            if (saleDate >= startDate && saleDate <= endDate) {
                totalRevenue += sale.total;
                salesInPeriod.push(sale);
            }
        }
    }

    // 2. Calculate Refunds by attributing them back to the original sale's date
    for (const refund of allRefunds) {
        // Find the original sale to get its date
        const originalSale = state.pos.completedSales.find(s => s.id === refund.originalSaleId);
        if (originalSale) {
             if (!startDate || !endDate) {
                totalRefunds += refund.amount;
                refundsInPeriod.push(refund);
            } else {
                const originalSaleDate = new Date(originalSale.date).toISOString().split('T')[0];
                if (originalSaleDate >= startDate && originalSaleDate <= endDate) {
                    totalRefunds += refund.amount;
                    refundsInPeriod.push(refund);
                }
            }
        }
    }
    
    const netRevenue = totalRevenue - totalRefunds;

    // 3. Filter expenses separately as they are managed directly in Finance (this logic is correct)
    const expenses = state.finance.expenses.filter(exp => {
        if (!startDate || !endDate) return true;
        return exp.date >= startDate && exp.date <= endDate;
    });
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 4. Calculate final net profit.
    const netProfit = netRevenue - totalExpenses;
    
    // 5. Return the comprehensive summary object.
    return { 
        totalRevenue, 
        totalRefunds, 
        netRevenue, 
        totalExpenses, 
        netProfit, 
        salesCount: salesInPeriod.length, 
        sales: salesInPeriod, 
        expenses, 
        refunds: refundsInPeriod 
    };
}


function renderFinanceView() {
    const { activeTab } = state.finance;

    let content;
    switch(activeTab) {
        case 'closures': content = renderFinanceClosures(); break;
        case 'expenses': content = renderFinanceExpenses(); break;
        case 'reporting': content = userHasPermission('finance:run_reports') ? renderFinanceReportsAndCharts() : '<p>You do not have permission to view reports.</p>'; break;
        case 'overview':
        default: content = renderFinanceOverview(); break;
    }

    return `
        <h2>Finance Module</h2>
        <nav class="admin-sub-nav">
             <button class="admin-sub-nav-button ${activeTab === 'overview' ? 'active' : ''}" data-finance-tab="overview">Overview</button>
             <button class="admin-sub-nav-button ${activeTab === 'closures' ? 'active' : ''}" data-finance-tab="closures">Daily Closures</button>
             <button class="admin-sub-nav-button ${activeTab === 'expenses' ? 'active' : ''}" data-finance-tab="expenses">Expenses</button>
             ${userHasPermission('finance:run_reports') ? `<button class="admin-sub-nav-button ${activeTab === 'reporting' ? 'active' : ''}" data-finance-tab="reporting">Reports & Charts</button>` : ''}
        </nav>
        <div class="finance-content">
            ${content}
        </div>
    `;
}

function renderFinanceOverview() {
    const summary = calculateFinancialSummary();
    const pendingClosures = state.finance.dailyClosures.filter(c => c.status === 'Pending');

    return `
        <div class="finance-kpi-grid">
            <div class="card kpi-card"><h4>Net Revenue</h4><p class="positive">Rs ${summary.netRevenue.toFixed(2)}</p></div>
            <div class="card kpi-card"><h4>Total Expenses</h4><p class="negative">Rs ${summary.totalExpenses.toFixed(2)}</p></div>
            <div class="card kpi-card"><h4>Net Profit</h4><p class="${summary.netProfit >= 0 ? 'positive' : 'negative'}">Rs ${summary.netProfit.toFixed(2)}</p></div>
            <div class="card kpi-card"><h4>Total Sales</h4><p>Rs ${summary.totalRevenue.toFixed(2)}</p></div>
        </div>
        <div class="card">
            <h3>Pending Actions</h3>
            ${pendingClosures.length > 0 ? `
                <p>There are <strong>${pendingClosures.length}</strong> daily sales closures pending your review.</p>
                <button class="button" data-finance-tab="closures">Review Closures</button>
            ` : `
                <p>There are no pending actions. All daily closures have been received.</p>
            `}
        </div>
    `;
}

function renderFinanceClosures() {
    if (!userHasPermission('finance:receive_sales')) {
        return `<div class="card"><p>You do not have permission to receive daily sales.</p></div>`;
    }

    const { dailyClosures, closureFilterStartDate, closureFilterEndDate, closureFilterUserId, closureFilterSearchQuery } = state.finance;

    const filteredClosures = dailyClosures.filter(c => {
        const closureDate = new Date(c.date).toISOString().split('T')[0];
        if (closureFilterStartDate && closureDate < closureFilterStartDate) return false;
        if (closureFilterEndDate && closureDate > closureFilterEndDate) return false;
        if (closureFilterUserId && c.userId.toString() !== closureFilterUserId) return false;
        if (closureFilterSearchQuery) {
            const query = closureFilterSearchQuery.toLowerCase();
            const matches = c.userName.toLowerCase().includes(query) || c.id.toLowerCase().includes(query);
            if (!matches) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


    const closureRows = filteredClosures.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${new Date(c.date).toLocaleString()}</td>
            <td>${c.userName}</td>
            <td class="price">Rs ${c.totalSales.toFixed(2)}</td>
            <td class="price">-Rs ${c.totalRefunds.toFixed(2)}</td>
            <td class="price">Rs ${(c.totalSales - c.totalRefunds).toFixed(2)}</td>
            <td><span class="closure-status ${c.status.toLowerCase()}">${c.status}</span></td>
            <td>
                ${c.status === 'Pending' ? `<button class="button-small" data-view-closure-id="${c.id}">View & Receive</button>` : `<button class="button-small" data-view-closure-id="${c.id}">View Details</button>`}
            </td>
        </tr>
    `).join('');

    const filterControls = `
        <form id="closure-filter-form" class="card">
            <h3>Filter Daily Closures</h3>
            <div class="form-grid-4">
                <div class="form-group">
                    <label for="closure-start-date">From Date</label>
                    <input type="date" id="closure-start-date" name="startDate" value="${state.finance.closureFilterStartDate}">
                </div>
                <div class="form-group">
                    <label for="closure-end-date">To Date</label>
                    <input type="date" id="closure-end-date" name="endDate" value="${state.finance.closureFilterEndDate}">
                </div>
                <div class="form-group">
                    <label for="closure-user-filter">Filter by User</label>
                    <select id="closure-user-filter" name="userId">
                        <option value="">All Users</option>
                        ${state.users.map(u => `<option value="${u.id}" ${state.finance.closureFilterUserId === String(u.id) ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="closure-search">Search</label>
                    <input type="text" id="closure-search" name="searchQuery" value="${state.finance.closureFilterSearchQuery}" placeholder="ID or Cashier Name...">
                </div>
            </div>
            <div class="reporting-actions" style="justify-content: flex-start; margin-top: 1rem;">
                <button type="submit" class="button">Apply Filters</button>
                <button type="button" class="button secondary" id="reset-closure-filters">Reset Filters</button>
                <button type="button" class="button" id="export-closures-pdf" ${filteredClosures.length === 0 ? 'disabled' : ''}>Export to PDF</button>
                <button type="button" class="button secondary" id="export-closures-csv" ${filteredClosures.length === 0 ? 'disabled' : ''}>Export to CSV</button>
            </div>
        </form>
    `;

    return `
        ${filterControls}
        <div class="card">
            <h3>Daily Sales Reception</h3>
            <p>Review and confirm the end-of-day sales reports submitted by cashiers.</p>
            <table class="data-table">
                <thead><tr><th>ID</th><th>Date & Time</th><th>Cashier</th><th>Gross Sales</th><th>Refunds</th><th>Net Total</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>${closureRows.length > 0 ? closureRows : '<tr><td colspan="8">No closures found for the selected filters.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderFinanceExpenses() {
    const { expenses, editingExpenseId, expenseFilterStartDate, expenseFilterEndDate, expenseFilterUserId, expenseFilterSearchQuery } = state.finance;

    const filteredExpenses = expenses.filter(exp => {
        if (expenseFilterStartDate && exp.date < expenseFilterStartDate) return false;
        if (expenseFilterEndDate && exp.date > expenseFilterEndDate) return false;
        if (expenseFilterUserId && exp.userId.toString() !== expenseFilterUserId) return false;
        if (expenseFilterSearchQuery) {
            const query = expenseFilterSearchQuery.toLowerCase();
            const matches = exp.userName.toLowerCase().includes(query) || exp.category.toLowerCase().includes(query) || exp.description.toLowerCase().includes(query);
            if (!matches) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const expenseRows = filteredExpenses.map(exp => `
        <tr>
            <td>${exp.date}</td>
            <td>${exp.category}</td>
            <td>${exp.description}</td>
            <td>${exp.userName}</td>
            <td class="price">Rs ${exp.amount.toFixed(2)}</td>
            <td>
                ${userHasPermission('finance:manage_expenses') ? `
                    <button class="button-small" data-edit-expense-id="${exp.id}">Edit</button>
                    <button class="button-small secondary" data-delete-expense-id="${exp.id}">Delete</button>
                ` : ''}
            </td>
        </tr>
    `).join('');

    const editingExpense = editingExpenseId ? expenses.find(e => e.id === editingExpenseId) : null;

    const filterControls = `
        <form id="expense-filter-form" class="card">
            <h3>Filter Expenses</h3>
            <div class="form-grid-4">
                <div class="form-group">
                    <label for="expense-start-date">From Date</label>
                    <input type="date" id="expense-start-date" name="startDate" value="${expenseFilterStartDate}">
                </div>
                <div class="form-group">
                    <label for="expense-end-date">To Date</label>
                    <input type="date" id="expense-end-date" name="endDate" value="${expenseFilterEndDate}">
                </div>
                <div class="form-group">
                    <label for="expense-user-filter">Filter by User</label>
                    <select id="expense-user-filter" name="userId">
                        <option value="">All Users</option>
                        ${state.users.map(u => `<option value="${u.id}" ${expenseFilterUserId === String(u.id) ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="expense-search">Search</label>
                    <input type="text" id="expense-search" name="searchQuery" value="${expenseFilterSearchQuery}" placeholder="Category, Description, User...">
                </div>
            </div>
            <div class="reporting-actions" style="justify-content: flex-start; margin-top: 1rem;">
                <button type="submit" class="button">Apply Filters</button>
                <button type="button" class="button secondary" id="reset-expense-filters">Reset Filters</button>
                <button type="button" class="button" id="export-expenses-pdf" ${filteredExpenses.length === 0 ? 'disabled' : ''}>Export to PDF</button>
                <button type="button" class="button secondary" id="export-expenses-csv" ${filteredExpenses.length === 0 ? 'disabled' : ''}>Export to CSV</button>
            </div>
        </form>
    `;

    return `
        ${filterControls}
        <div class="card">
            <h3>Expense Records</h3>
             <table class="data-table">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Added By</th><th>Amount</th><th>Actions</th></tr></thead>
                <tbody>${expenseRows.length > 0 ? expenseRows : '<tr><td colspan="6">No expenses found for the selected filters.</td></tr>'}</tbody>
            </table>
        </div>
        ${userHasPermission('finance:manage_expenses') ? `
        <div class="card">
            <form id="add-expense-form" class="admin-add-form">
                <h4>${editingExpense ? 'Edit Expense' : 'Add New Expense'}</h4>
                <div class="form-grid-4">
                    <div class="form-group"><label>Date</label><input type="date" name="date" value="${editingExpense?.date || new Date().toISOString().split('T')[0]}" required></div>
                    <div class="form-group"><label>Category</label><input type="text" name="category" value="${editingExpense?.category || ''}" required></div>
                    <div class="form-group"><label>Description</label><input type="text" name="description" value="${editingExpense?.description || ''}" required></div>
                    <div class="form-group"><label>Amount</label><input type="number" step="0.01" name="amount" value="${editingExpense?.amount || ''}" required></div>
                </div>
                <button type="submit" class="button">${editingExpense ? 'Update Expense' : 'Add Expense'}</button>
                ${editingExpense ? `<button type="button" class="button secondary" id="cancel-edit-expense">Cancel Edit</button>` : ''}
            </form>
        </div>` : ''}
    `;
}

function renderFinanceReportsAndCharts() {
    return `
        <div class="card">
            <h3>Revenue vs. Expenses (Last 30 Days)</h3>
            <div class="chart-container">
                <canvas id="revenue-expense-chart"></canvas>
            </div>
        </div>
        <div class="card">
            <h3>Expense Breakdown by Category</h3>
             <div class="chart-container" style="max-height: 400px; max-width: 400px; margin: auto;">
                <canvas id="expense-category-chart"></canvas>
            </div>
        </div>
        <div class="card">
            <h3>Financial Reporting Download</h3>
            <p>Generate a consolidated financial report for a specific period. The report will include summaries of sales, refunds, expenses, and profit based on received daily closures.</p>
            <div class="reporting-controls">
                <div class="form-group">
                    <label for="report-start-date">Start Date</label>
                    <input type="date" id="report-start-date" value="${state.finance.reportStartDate}">
                </div>
                <div class="form-group">
                    <label for="report-end-date">End Date</label>
                    <input type="date" id="report-end-date" value="${state.finance.reportEndDate}">
                </div>
                <div class="reporting-actions">
                    <button class="button" id="export-finance-pdf">Export as PDF</button>
                    <button class="button secondary" id="export-finance-csv">Export as CSV</button>
                </div>
            </div>
        </div>
    `;
}

function renderFinanceClosureDetailModal(closure: any) {
    const netTotal = closure.totalSales - closure.totalRefunds;
    const isPending = closure.status === 'Pending';
    return `
        <div class="modal-overlay finance-modal-overlay">
            <div class="modal-content card finance-modal-content">
                <button class="modal-close-btn" id="cancel-view-closure">&times;</button>
                <h3>${isPending ? 'Review Closure' : 'Closure Details'}: ${closure.userName}</h3>
                <p><strong>Date Submitted:</strong> ${new Date(closure.date).toLocaleString()}</p>
                
                <h4>Summary</h4>
                <div class="kpi-grid" style="margin-bottom: 1.5rem;">
                    <div class="kpi-item"><span class="kpi-label">Gross Sales</span><span class="kpi-value positive">Rs ${closure.totalSales.toFixed(2)}</span></div>
                    <div class="kpi-item"><span class="kpi-label">Sales Count</span><span class="kpi-value">${closure.salesCount}</span></div>
                    <div class="kpi-item"><span class="kpi-label">Refunds</span><span class="kpi-value negative">-Rs ${closure.totalRefunds.toFixed(2)}</span></div>
                    <div class="kpi-item net-total"><span class="kpi-label">Net Total</span><span class="kpi-value">Rs ${netTotal.toFixed(2)}</span></div>
                </div>

                <h4>Sales Invoices (${closure.salesInvoices.length})</h4>
                <div class="modal-table-container">
                    <table class="data-table compact">
                        <thead><tr><th>Invoice ID</th><th>Time</th><th>Customer</th><th class="price">Total</th></tr></thead>
                        <tbody>
                            ${closure.salesInvoices.map((sale: any) => `
                                <tr>
                                    <td>${sale.id}</td>
                                    <td>${new Date(sale.date).toLocaleTimeString()}</td>
                                    <td>${sale.studentName}</td>
                                    <td class="price">Rs ${sale.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                 <h4>Refunds (${closure.refundInvoices.length})</h4>
                <div class="modal-table-container">
                    <table class="data-table compact">
                         <thead><tr><th>Refund ID</th><th>Time</th><th>Original Sale ID</th><th class="price">Amount</th></tr></thead>
                        <tbody>
                             ${closure.refundInvoices.length > 0 ? closure.refundInvoices.map((refund: any) => `
                                <tr>
                                    <td>${refund.id}</td>
                                    <td>${new Date(refund.date).toLocaleTimeString()}</td>
                                    <td>${refund.originalSaleId}</td>
                                    <td class="price">-Rs ${refund.amount.toFixed(2)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4">No refunds in this session.</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div class="modal-actions">
                    <button type="button" class="button secondary" id="cancel-view-closure">Close</button>
                    ${isPending ? `<button type="button" class="button" id="confirm-receive-closure" data-closure-id="${closure.id}">Confirm & Receive</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderFrontDeskView() {
    return `
        <h2>Front Desk</h2>
        ${userHasPermission('frontdesk:create_order') ? `
        <div class="card">
            <button class="button" id="start-new-print-order">Create New Print Order</button>
        </div>` : ''}
        <div id="front-desk-content">
            ${state.printing.step !== 'details' ? renderPrintOrderWizard() : renderManagerView(true)}
        </div>
    `;
}

function renderAdminView() {
    const adminNav = `
        <nav class="admin-nav">
            ${userHasPermission('admin:manage_users') || userHasPermission('admin:manage_roles') ? `<button class="admin-nav-button ${state.admin.currentView === 'users' ? 'active' : ''}" data-admin-view="users">Users & Roles</button>` : ''}
            ${userHasPermission('admin:view_audit_log') ? `<button class="admin-nav-button ${state.admin.currentView === 'audit_log' ? 'active' : ''}" data-admin-view="audit_log">Audit Log</button>` : ''}
            ${userHasPermission('admin:manage_returns') ? `<button class="admin-nav-button ${state.admin.currentView === 'returns' ? 'active' : ''}" data-admin-view="returns">Adjustment Requests <span class="badge">${state.returns.filter(r => r.status === 'Pending').length}</span></button>` : ''}
            ${userHasPermission('admin:manage_pos_settings') ? `<button class="admin-nav-button ${state.admin.currentView === 'pos_settings' ? 'active' : ''}" data-admin-view="pos_settings">Point of Sale</button>` : ''}
            ${userHasPermission('admin:view') ? `<button class="admin-nav-button ${state.admin.currentView === 'photocopy_settings' ? 'active' : ''}" data-admin-view="photocopy_settings">Service Center</button>` : ''}
            ${userHasPermission('admin:manage_print_settings') ? `<button class="admin-nav-button ${state.admin.currentView === 'print_service' ? 'active' : ''}" data-admin-view="print_service">Printing Service</button>` : ''}
            ${userHasPermission('admin:manage_payment_gateways') ? `<button class="admin-nav-button ${state.admin.currentView === 'payment_gateways' ? 'active' : ''}" data-admin-view="payment_gateways">Payment Gateways</button>` : ''}
            ${userHasPermission('admin:manage_invoice_settings') ? `<button class="admin-nav-button ${state.admin.currentView === 'invoice_settings' ? 'active' : ''}" data-admin-view="invoice_settings">Invoice Settings</button>` : ''}
            ${userHasPermission('admin:manage_app_settings') ? `<button class="admin-nav-button ${state.admin.currentView === 'settings' ? 'active' : ''}" data-admin-view="settings">Settings</button>` : ''}
        </nav>
    `;

    let adminContent;
    switch (state.admin.currentView) {
        case 'users': adminContent = renderAdminUsersAndRoles(); break;
        case 'audit_log': adminContent = renderAdminAuditLog(); break;
        case 'returns': adminContent = renderAdminReturns(); break;
        case 'pos_settings': adminContent = renderAdminPOSSettings(); break;
        case 'photocopy_settings': adminContent = renderAdminPhotocopySettings(); break;
        case 'settings': adminContent = renderAdminSettings(); break;
        case 'print_service': adminContent = renderAdminPrintingService(); break;
        case 'payment_gateways': adminContent = renderAdminPaymentGateways(); break;
        case 'invoice_settings': adminContent = renderAdminInvoiceSettings(); break;
        default: adminContent = renderAdminUsersAndRoles(); break;
    }

    return `<div class="admin-panel">${adminNav}<div class="admin-content">${adminContent}</div></div>`;
}


// --- Legacy Views (reused or embedded) ---
function calculateCartTotals() {
    const subtotal = state.pos.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const discountAmount = state.pos.discount > subtotal ? subtotal : state.pos.discount;
    const amountAfterDiscount = subtotal - discountAmount;
    const taxAmount = amountAfterDiscount * (state.pos.taxRate / 100);
    const total = amountAfterDiscount + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
}

function calculatePhotocopyTotals() {
    const { photocopy: form, settings: { photocopySettings: settings } } = state;
    const breakdown: { item: string; cost: number; }[] = [];
    let total = 0;

    switch (form.serviceType) {
        case 'photocopy': {
            const selectedPaperSize = settings.paperSizes.find(p => p.id === form.paperSize);
            const paperType = settings.paperTypes.find(p => p.id === form.paperType);
            if (!selectedPaperSize) break;

            const totalPages = form.bwPages + form.colorPages;
            if (totalPages === 0) break;

            const bwCost = form.bwPages * selectedPaperSize.bwPrice;
            const colorCost = form.colorPages * selectedPaperSize.colorPrice;
            const paperSurcharge = totalPages * (paperType?.extraCost || 0);

            let subtotal = (bwCost + colorCost + paperSurcharge) * form.copies;
            if(bwCost > 0) breakdown.push({ item: `B&W Pages (${form.bwPages} x Rs ${selectedPaperSize.bwPrice.toFixed(2)})`, cost: bwCost });
            if(colorCost > 0) breakdown.push({ item: `Color Pages (${form.colorPages} x Rs ${selectedPaperSize.colorPrice.toFixed(2)})`, cost: colorCost });
            if(paperSurcharge > 0) breakdown.push({ item: `Paper Surcharge (${paperType?.name})`, cost: paperSurcharge });
            if(form.copies > 1) breakdown.push({ item: `Copies (x${form.copies})`, cost: subtotal });

            total += subtotal;

            if (form.finishingLamination) {
                const laminationCost = totalPages * form.copies * settings.serviceCosts.laminationPerPage;
                breakdown.push({ item: `Lamination (${totalPages * form.copies} pages)`, cost: laminationCost });
                total += laminationCost;
            }
            if (form.finishingStaple) {
                const stapleCost = form.copies * settings.serviceCosts.staplePerSet;
                breakdown.push({ item: `Stapling (${form.copies} sets)`, cost: stapleCost });
                total += stapleCost;
            }
            break;
        }
        case 'scan': {
            if (form.scanPages <= 0) break;
            const scanCost = form.scanPages * settings.serviceCosts.scanPerPage;
            breakdown.push({ item: `Scanning (${form.scanPages} pages)`, cost: scanCost });
            total += scanCost;
            break;
        }
        case 'id_card': {
            if (form.idCardCount <= 0) break;
            const cardCost = form.idCardCount * settings.serviceCosts.idCard;
            breakdown.push({ item: `ID Cards (${form.idCardCount})`, cost: cardCost });
            total += cardCost;
            break;
        }
    }

    if (form.isUrgent) {
        breakdown.push({ item: 'Urgent Service Fee', cost: settings.serviceCosts.urgentFee });
        total += settings.serviceCosts.urgentFee;
    }

    return { breakdown, total };
}

function renderAdjustmentModal(data: { sale: any, type: 'return' | 'cancel' | 'adjustDiscount' }) {
    const { sale, type } = data;
    let title: string;
    let content: string;
    let formId = 'adjustment-request-form';

    switch (type) {
        case 'cancel':
            title = 'Request Invoice Cancellation';
            content = `
                <p>You are requesting to cancel the entire invoice <strong>#${sale.id}</strong>, which will refund the total amount of <strong>Rs ${sale.total.toFixed(2)}</strong> to the customer upon approval.</p>
                <div class="form-group">
                    <label for="cancellation-reason">Reason for Cancellation (Required)</label>
                    <textarea id="cancellation-reason" name="reason" rows="4" required></textarea>
                </div>
            `;
            break;
        case 'adjustDiscount':
            title = 'Request Discount Adjustment';
            const originalDiscount = sale.discountAmount || 0;
            const originalTotal = sale.total;
            content = `
                <p>Adjust the discount for invoice <strong>#${sale.id}</strong>. The difference will be refunded upon approval.</p>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Original Discount</label>
                        <input type="text" value="Rs ${originalDiscount.toFixed(2)}" disabled>
                    </div>
                     <div class="form-group">
                        <label>Original Total</label>
                        <input type="text" value="Rs ${originalTotal.toFixed(2)}" disabled>
                    </div>
                </div>
                 <div class="form-group">
                    <label for="new-discount">New Discount Amount (Rs)</label>
                    <input type="text" inputmode="numeric" id="new-discount" name="newDiscount" required>
                </div>
                <div class="form-group">
                    <label for="adjustment-reason">Reason for Adjustment (Required)</label>
                    <textarea id="adjustment-reason" name="reason" rows="3" required></textarea>
                </div>
            `;
            break;
        case 'return':
        default:
            title = `Request ${sale.type === 'photocopy' || sale.type === 'printing' ? 'Full Refund' : 'Item Return'}`;
            const isServiceSale = sale.type === 'photocopy' || sale.type === 'printing';
            if (isServiceSale) {
                let detailsHtml = '';
                if (sale.type === 'photocopy') {
                     detailsHtml = sale.details.breakdown.map((item: any) => `
                        <tr>
                            <td>${item.item}</td>
                            <td class="price">Rs ${item.cost.toFixed(2)}</td>
                        </tr>
                    `).join('');
                } else { // Printing
                    detailsHtml = sale.items.map((item: any) => `
                         <tr>
                            <td>${item.name}</td>
                            <td class="price">Rs ${item.price.toFixed(2)}</td>
                        </tr>
                    `).join('');
                }

                content = `
                    <h4>Service Details</h4>
                    <table class="data-table compact">
                        <tbody>
                            ${detailsHtml}
                            <tr class="grand-total-row"><td style="border-top: 1px solid #ccc;">Total</td><td class="price" style="border-top: 1px solid #ccc;">Rs ${sale.total.toFixed(2)}</td></tr>
                        </tbody>
                    </table>
                    <p>Service sales can only be fully refunded. Submitting this request will ask an admin to approve a full refund of <strong>Rs ${sale.total.toFixed(2)}</strong>.</p>
                `;
            } else { // POS Sale
                content = `
                    <table class="data-table">
                        <thead>
                            <tr><th>Item</th><th>Price</th><th>Purchased</th><th>Qty to Return</th></tr>
                        </thead>
                        <tbody>
                            ${sale.items.map((item: any) => {
                                const alreadyReturned = sale.returnedItems?.[item.isbn] || 0;
                                const maxReturnable = item.quantity - alreadyReturned;
                                return `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>Rs ${item.price.toFixed(2)}</td>
                                    <td>${item.quantity} ${alreadyReturned > 0 ? `<small>(${alreadyReturned} returned)</small>` : ''}</td>
                                    <td>
                                        <input type="text" inputmode="numeric" name="return_qty_${item.isbn}" value="0" class="return-qty-input" ${maxReturnable <= 0 ? 'disabled' : ''} id="return_qty_${item.isbn}">
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                `;
            }
            break;
    }

    return `
        <div class="modal-overlay" id="adjustment-modal-overlay">
            <div class="modal-content card">
                <h3>${title}</h3>
                <p>For Invoice <strong>#${sale.id}</strong></p>
                <form id="${formId}" data-sale-id="${sale.id}" data-request-type="${type}">
                    ${content}
                    <div class="modal-actions">
                        <button type="button" class="button secondary" id="cancel-adjustment-request">Cancel</button>
                        <button type="submit" class="button">Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}


function renderClosureModal(previewData: any) {
    if (!previewData) return '';
    const netTotal = previewData.totalSales - previewData.totalRefunds;
    return `
        <div class="modal-overlay" id="closure-modal-overlay">
            <div class="modal-content card">
                <h3>Confirm Day's Sale Closure</h3>
                <p>Please review the summary below before generating your final report for submission.</p>
                <div class="kpi-grid" style="margin-bottom: 1rem; grid-template-columns: 1fr 1fr;">
                     <div class="kpi-item">
                        <span class="kpi-label">Total Sales</span>
                        <span class="kpi-value positive">Rs ${previewData.totalSales.toFixed(2)}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Transactions</span>
                        <span class="kpi-value">${previewData.salesCount}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Total Refunds</span>
                        <span class="kpi-value negative">-Rs ${previewData.totalRefunds.toFixed(2)}</span>
                    </div>
                     <div class="kpi-item">
                        <span class="kpi-label">Refunds</span>
                        <span class="kpi-value">${previewData.refundsCount}</span>
                    </div>
                    <div class="kpi-item net-total">
                        <span class="kpi-label">Net Total</span>
                        <span class="kpi-value">Rs ${netTotal.toFixed(2)}</span>
                    </div>
                </div>
                <div class="warning-message"><strong>Warning:</strong> This action is final for this session and cannot be undone.</div>
                <div class="modal-actions">
                    <button type="button" class="button secondary" id="cancel-closure">Cancel</button>
                    <button type="button" class="button" id="confirm-closure">Confirm & Generate Report</button>
                </div>
            </div>
        </div>
    `;
}


function renderPOSSalesHistoryView() {
    const currentUser = state.auth.user!;
    const { historyStartDate, historyEndDate } = state.pos;
    const filteredSales = state.pos.completedSales.filter(sale => {
        const saleDate = new Date(sale.date).toISOString().split('T')[0];
        // Filter by user and ensure dates are valid
        return sale.userId === currentUser.id && 
               saleDate >= historyStartDate && 
               saleDate <= historyEndDate;
    });

    const historyRows = filteredSales.map(sale => {
        let actionContent;

        // If sale is part of a closure, it's locked and no more actions can be taken.
        if (sale.closureId) {
            actionContent = '<span class="refund-status-badge full">Closed</span>';
        } else if (sale.status === 'Cancelled') {
            actionContent = '<span class="refund-status-badge cancelled">Cancelled</span>';
        } else if (sale.refundStatus === 'Full') {
            actionContent = '<span class="refund-status-badge full">Fully Refunded</span>';
        } else {
            // It's 'Partial' or 'None' and not yet closed.
            const canAdjust = sale.refundStatus === 'None';
            actionContent = `
                <div class="action-button-group">
                    ${sale.refundStatus === 'Partial' ? '<span class="refund-status-badge partial">Partial Refund</span>' : ''}
                    <button class="button-small" data-action-return-sale-id="${sale.id}">Return Items</button>
                    <button class="button-small" data-action-cancel-sale-id="${sale.id}" ${!canAdjust ? 'disabled title="Cannot cancel an invoice with returned items."' : ''}>Cancel Invoice</button>
                    <button class="button-small" data-action-discount-sale-id="${sale.id}" ${!canAdjust ? 'disabled title="Cannot adjust discount on an invoice with returned items."' : ''}>Adjust Discount</button>
                </div>
            `;
        }
        
        const typeMap: { [key: string]: string } = {
            photocopy: 'Service Center',
            printing: 'Printing',
            'pos': 'POS Sale'
        };


        return `
        <tr>
            <td>${sale.id}</td>
            <td>${new Date(sale.date).toLocaleTimeString()}</td>
            <td>${typeMap[sale.type] || 'POS Sale'}</td>
            <td>${sale.studentName}</td>
            <td class="price">Rs ${sale.total.toFixed(2)}</td>
            <td>${actionContent}</td>
        </tr>
    `}).join('');

    return `
        <div class="card">
            <h3>Your Sales History</h3>
            <div class="sales-history-controls">
                <div class="date-filter-group">
                    <div class="form-group">
                        <label for="pos-history-start-date">From Date</label>
                        <input type="date" id="pos-history-start-date" value="${state.pos.historyStartDate}">
                    </div>
                    <div class="form-group">
                        <label for="pos-history-end-date">To Date</label>
                        <input type="date" id="pos-history-end-date" value="${state.pos.historyEndDate}">
                    </div>
                    <button class="button" id="filter-sales-history-btn">Search</button>
                </div>
                <div class="sales-history-actions">
                    <button class="button" id="export-history-pdf-btn" ${filteredSales.length === 0 ? 'disabled' : ''}>Export to PDF</button>
                    <button class="button secondary" id="export-history-csv-btn" ${filteredSales.length === 0 ? 'disabled' : ''}>Export to CSV</button>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>Invoice ID</th><th>Time</th><th>Type</th><th>Customer</th><th>Total</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${historyRows.length > 0 ? historyRows : '<tr><td colspan="6">No sales found for the selected date range.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderPOSView() {
    if (state.pos.currentInvoice) {
        return renderInvoiceView(state.pos.currentInvoice);
    }
    if (state.photocopy.currentInvoice) {
        return renderInvoiceView(state.photocopy.currentInvoice);
    }
    
    const { posSettings } = state.settings;

    const cartItems = state.pos.cart.map(item => `
        <li class="cart-item">
             <div class="cart-item-details">
                <span>${item.name}</span>
                <span class="cart-item-line-total">Rs ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div class="cart-item-actions">
                 <button class="button-small" data-decrease-qty="${item.isbn}">-</button>
                 <span class="cart-item-quantity">${item.quantity}</span>
                 <button class="button-small" data-increase-qty="${item.isbn}">+</button>
                 <button class="button-small secondary" data-remove-cart-item="${item.isbn}">X</button>
            </div>
        </li>`).join('');
    
    const totals = calculateCartTotals();

    const outOfStockItems = Object.entries(state.inventory).filter(([_, item]) => item.stock <= 0);
    const lowStockItems = Object.entries(state.inventory).filter(([_, item]) => item.stock > 0 && item.stock <= posSettings.lowStockThreshold);

    const inventoryAlerts = (outOfStockItems.length > 0 || lowStockItems.length > 0) ? `
        <div class="card inventory-alert-card">
            <h4>Inventory Alerts</h4>
            ${outOfStockItems.length > 0 ? `
                <div class="alert-section out-of-stock">
                    <h5>Out of Stock</h5>
                    <ul>
                        ${outOfStockItems.map(([_, item]) => `<li><strong>${item.name}</strong></li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            ${lowStockItems.length > 0 ? `
                <div class="alert-section low-stock">
                    <h5>Low Stock</h5>
                    <ul>
                        ${lowStockItems.map(([_, item]) => `<li><strong>${item.name}</strong> (${item.stock} left)</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    ` : '';

    const newSaleView = `
        <div id="pos-container">
            <div class="pos-main-column">
                ${inventoryAlerts}
                ${posSettings.allowCustomerSelection ? `
                 <div class="card" id="pos-customer-card">
                    <h4>Customer Details</h4>
                     <div class="form-group search-container">
                        <label>Search Registered Student</label>
                        <input type="text" id="pos-student-search" value="${state.pos.studentSearchQuery}" placeholder="Search to auto-fill..." autocomplete="off">
                        <div class="search-results-list" id="pos-student-search-results">
                            ${state.pos.studentSearchResults.map(s => `<div class="search-result-item" data-select-pos-student='${JSON.stringify({id: s.id, name: s.name})}'>${s.name} (ID: ${s.id})</div>`).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pos-manual-customer">Or Enter Customer Name Manually</label>
                        <input type="text" id="pos-manual-customer" value="${state.pos.manualCustomerName}" placeholder="e.g., Walk-in Customer">
                    </div>
                    <div><strong>Billed To:</strong> <span id="pos-current-customer">${state.pos.selectedStudent?.name || state.pos.manualCustomerName || 'Walk-in Customer'}</span>
                        ${state.pos.selectedStudent ? `<button class="button-small" id="pos-clear-student">Clear</button>` : ''}
                    </div>
                </div>` : ''}

                <div class="card">
                    <h4>Add Items to Cart</h4>
                    ${posSettings.allowBarcodeScanning ? `
                    <div id="scanner-ui" style="text-align: center; margin-bottom: 1rem;">
                        ${!state.pos.isScanning ? '<button class="button" id="start-scan-btn">Start Barcode Scanning</button>' : '<button class="button secondary" id="stop-scan-btn">Stop Scanning</button>'}
                        <video id="scanner-video" ${state.pos.isScanning ? 'style="display: block; margin-top: 1rem;"' : 'style="display: none;"'} autoplay playsinline></video>
                    </div>
                     <hr>` : ''}
                    ${posSettings.allowManualSearch ? `
                     <div class="form-group search-container">
                        <label for="pos-manual-search">Search Item (Name or ISBN)</label>
                        <input type="text" id="pos-manual-search" value="${state.pos.manualSearchQuery}" placeholder="Search for a book...">
                        <div class="search-results-list" id="pos-manual-search-results">
                             ${state.pos.manualSearchResults.map(item => `<div class="search-result-item" data-add-manual-item="${item.isbn}">${item.name} - Rs ${item.price.toFixed(2)} (${item.stock} in stock)</div>`).join('')}
                        </div>
                    </div>` : ''}
                </div>
                 <div class="card">
                    <h4>Full Inventory (Click to Add)</h4>
                    <div class="inventory-list-pos">
                        <table class="data-table compact">
                            <thead><tr><th>Book</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
                            <tbody>
                                ${Object.entries(state.inventory).map(([isbn, item]) => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>Rs ${item.price.toFixed(2)}</td>
                                        <td>${item.stock}</td>
                                        <td>
                                            <button class="button-small" data-add-item-from-list="${isbn}" ${item.stock <= 0 ? 'disabled' : ''}>Add</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="pos-sidebar-column">
                <div id="cart-container" class="card">
                    <h3>Shopping Cart</h3>
                    <ul id="cart-items">${cartItems.length > 0 ? cartItems : '<li>Cart is empty.</li>'}</ul>
                    <hr>
                    <div class="cart-summary">
                        <div><span>Subtotal:</span> <span class="price">Rs ${totals.subtotal.toFixed(2)}</span></div>
                        <div class="form-group-inline">
                            <label for="pos-discount">Discount (Rs):</label>
                            <input type="text" inputmode="numeric" id="pos-discount" value="${state.pos.discount}">
                        </div>
                         <div class="form-group-inline">
                            <label for="pos-tax">Tax (%):</label>
                            <input type="text" inputmode="numeric" id="pos-tax" value="${state.pos.taxRate}">
                        </div>
                        <div><span>Tax Amount:</span> <span class="price">Rs ${totals.taxAmount.toFixed(2)}</span></div>
                    </div>
                    <hr>
                    <div id="cart-total">Total: Rs ${totals.total.toFixed(2)}</div>
                    <div class="pos-checkout-actions">
                        <button class="button secondary" id="cancel-current-sale-btn" ${state.pos.cart.length === 0 ? 'disabled' : ''}>Cancel Sale</button>
                        <button class="button" id="checkout-btn" ${state.pos.cart.length === 0 ? 'disabled' : ''}>Complete Sale & Generate Invoice</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    let content;
    switch (state.pos.activeTab) {
        case 'history':
            content = renderPOSSalesHistoryView();
            break;
        case 'service_center':
            content = renderServiceCenterContent();
            break;
        case 'new_sale':
        default:
            content = newSaleView;
            break;
    }

    return `
        <div class="pos-header">
            <h2>Point of Sale</h2>
            <div class="pos-actions">
                <button class="button secondary" id="close-day-sale-btn">Close Day's Sale</button>
            </div>
        </div>
        <nav class="pos-nav">
            <button class="pos-nav-button ${state.pos.activeTab === 'new_sale' ? 'active' : ''}" data-pos-tab="new_sale">New Sale</button>
            <button class="pos-nav-button ${state.pos.activeTab === 'history' ? 'active' : ''}" data-pos-tab="history">Sales History</button>
            ${userHasPermission('photocopy:use') ? `<button class="pos-nav-button ${state.pos.activeTab === 'service_center' ? 'active' : ''}" data-pos-tab="service_center">Service Center</button>` : ''}
        </nav>
        ${content}
    `;
}

function renderServiceCenterContent() {
    const form = state.photocopy;
    const { paperSizes, paperTypes } = state.settings.photocopySettings;
    const totals = calculatePhotocopyTotals();

    const serviceOptions = () => {
        switch(form.serviceType) {
            case 'photocopy':
                return `
                    <div class="form-grid-3">
                         <div class="form-group"><label for="copies">Copies</label><input type="text" inputmode="numeric" id="copies" value="${form.copies}" data-photocopy-field="copies"></div>
                        <div class="form-group"><label for="bwPages">B&W Pages</label><input type="text" inputmode="numeric" id="bwPages" value="${form.bwPages}" data-photocopy-field="bwPages"></div>
                        <div class="form-group"><label for="colorPages">Color Pages</label><input type="text" inputmode="numeric" id="colorPages" value="${form.colorPages}" data-photocopy-field="colorPages"></div>
                    </div>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="paperSize">Paper Size</label>
                            <select id="paperSize" data-photocopy-field="paperSize">
                                ${paperSizes.map(size => `<option value="${size.id}" ${form.paperSize === size.id ? 'selected' : ''}>${size.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="paperType">Paper Type</label>
                            <select id="paperType" data-photocopy-field="paperType">
                                ${paperTypes.map(type => `<option value="${type.id}" ${form.paperType === type.id ? 'selected' : ''}>${type.name} (+Rs ${type.extraCost.toFixed(2)})</option>`).join('')}
                            </select>
                        </div>
                    </div>
                     <div class="checkbox-grid">
                        <div class="checkbox-group"><input type="checkbox" id="isDuplex" ${form.isDuplex ? 'checked' : ''} data-photocopy-field="isDuplex"><label for="isDuplex">Duplex (Double-Sided)</label></div>
                        <div class="checkbox-group"><input type="checkbox" id="isBorderless" ${form.isBorderless ? 'checked' : ''} data-photocopy-field="isBorderless"><label for="isBorderless">Borderless Printing</label></div>
                    </div>
                `;
            case 'scan':
                 return `
                    <div class="form-grid-2">
                        <div class="form-group"><label for="scanPages">Number of Pages</label><input type="text" inputmode="numeric" id="scanPages" value="${form.scanPages}" data-photocopy-field="scanPages"></div>
                        <div class="form-group">
                            <label for="scanFormat">Output Format</label>
                            <select id="scanFormat" data-photocopy-field="scanFormat">
                                <option value="pdf" ${form.scanFormat === 'pdf' ? 'selected' : ''}>PDF</option>
                                <option value="jpeg" ${form.scanFormat === 'jpeg' ? 'selected' : ''}>JPEG</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group"><label for="emailTo">Send to Email (Optional)</label><input type="email" id="emailTo" value="${form.emailTo}" placeholder="customer@example.com" data-photocopy-field="emailTo"></div>
                `;
            case 'id_card':
                return `
                     <div class="form-grid-2">
                        <div class="form-group"><label for="idCardCount">Number of Cards</label><input type="text" inputmode="numeric" id="idCardCount" value="${form.idCardCount}" data-photocopy-field="idCardCount"></div>
                        <div class="form-group" style="display: flex; align-items: center; padding-top: 1.5rem;">
                            <div class="checkbox-group"><input type="checkbox" id="idCardLaminated" ${form.idCardLaminated ? 'checked' : ''} data-photocopy-field="idCardLaminated"><label for="idCardLaminated">Laminate Cards</label></div>
                        </div>
                    </div>
                `;
            default: return '';
        }
    };

    return `
        <div id="photocopy-container" class="service-center-container">
            <div class="photocopy-main-column">
                <form id="photocopy-form">
                     <div class="card">
                        <h3>Customer</h3>
                        <div class="form-group">
                            <label for="photocopy-customer-name">Customer Name</label>
                            <input type="text" id="photocopy-customer-name" value="${form.manualCustomerName}" placeholder="e.g., Walk-in Customer" data-photocopy-field="manualCustomerName">
                        </div>
                    </div>
                    <div class="card">
                        <h3>1. Select Service</h3>
                        <div class="service-selector">
                             <input type="radio" id="service-photocopy" name="serviceType" value="photocopy" ${form.serviceType === 'photocopy' ? 'checked' : ''} data-photocopy-field="serviceType">
                             <label for="service-photocopy">Photocopy</label>
                             <input type="radio" id="service-scan" name="serviceType" value="scan" ${form.serviceType === 'scan' ? 'checked' : ''} data-photocopy-field="serviceType">
                             <label for="service-scan">Scanning</label>
                             <input type="radio" id="service-id_card" name="serviceType" value="id_card" ${form.serviceType === 'id_card' ? 'checked' : ''} data-photocopy-field="serviceType">
                             <label for="service-id_card">ID Card Printing</label>
                        </div>
                    </div>
                     <div class="card service-options-container">
                        <h3>2. Service Options</h3>
                        ${serviceOptions()}
                    </div>
                     <div class="card">
                        <h3>3. Finishing & Add-ons</h3>
                         <div class="checkbox-grid">
                            ${form.serviceType === 'photocopy' ? `<div class="checkbox-group"><input type="checkbox" id="finishingLamination" ${form.finishingLamination ? 'checked' : ''} data-photocopy-field="finishingLamination"><label for="finishingLamination">Lamination</label></div>` : ''}
                            ${form.serviceType === 'photocopy' ? `<div class="checkbox-group"><input type="checkbox" id="finishingStaple" ${form.finishingStaple ? 'checked' : ''} data-photocopy-field="finishingStaple"><label for="finishingStaple">Stapling</label></div>` : ''}
                            <div class="checkbox-group"><input type="checkbox" id="isUrgent" ${form.isUrgent ? 'checked' : ''} data-photocopy-field="isUrgent"><label for="isUrgent">Urgent Service</label></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="photocopy-sidebar-column">
                <div id="photocopy-summary-container" class="card">
                    <h3>Order Summary</h3>
                    <table class="photocopy-summary-table">
                        <tbody>
                            ${totals.breakdown.map(item => `
                                <tr>
                                    <td>${item.item}</td>
                                    <td class="price">Rs ${item.cost.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <hr>
                    <div id="cart-total">Total: Rs ${totals.total.toFixed(2)}</div>
                    <button class="button" id="photocopy-checkout-btn" ${totals.total <= 0 ? 'disabled' : ''}>Complete Sale & Generate Invoice</button>
                </div>
            </div>
        </div>
    `;
}

function renderInvoiceView(invoice: any) {
    if (!invoice) return ``;

    const { invoiceSettings, shopName } = state.settings;
    const isFinalized = invoice.isFinalized;
    const isPhotocopy = invoice.type === 'photocopy';

    let tableBody, tableFooter;

    if (isPhotocopy) {
        tableBody = invoice.details.breakdown.map((item: any) => `
            <tr>
                <td colspan="3">${item.item}</td>
                <td class="price">Rs ${item.cost.toFixed(2)}</td>
            </tr>
        `).join('');
        tableFooter = `
            <tr class="grand-total-row">
                <td colspan="3">Total</td>
                <td class="price">Rs ${invoice.total.toFixed(2)}</td>
            </tr>
        `;
    } else {
        // Original POS invoice rendering
        tableBody = invoice.items.map((item: any) => `
            <tr>
                <td>${item.name}</td>
                <td class="qty">${item.quantity}</td>
                <td class="price">Rs ${item.price.toFixed(2)}</td>
                <td class="price">Rs ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');
        tableFooter = `
            <tr><td colspan="3">Subtotal</td><td class="price">Rs ${invoice.subtotal.toFixed(2)}</td></tr>
            ${invoice.discountAmount > 0 ? `<tr><td colspan="3">Discount</td><td class="price">-Rs ${invoice.discountAmount.toFixed(2)}</td></tr>` : ''}
            ${invoice.taxAmount > 0 ? `<tr><td colspan="3">Tax</td><td class="price">Rs ${invoice.taxAmount.toFixed(2)}</td></tr>` : ''}
            <tr class="grand-total-row">
                <td colspan="3">Total</td>
                <td class="price">Rs ${invoice.total.toFixed(2)}</td>
            </tr>
        `;
    }


    return `
        <h2>${isFinalized ? 'Sale Completed' : 'Confirm Sale'}</h2>
        <div class="invoice-container card">
            ${isFinalized ? '<div class="invoice-paid-stamp">PAID</div>' : ''}
            <div class="invoice-header">
                <div>
                    ${invoiceSettings.logoUrl ? `<img src="${invoiceSettings.logoUrl}" alt="Shop Logo" class="invoice-logo">` : ''}
                    ${invoiceSettings.showShopName ? `<h3>${shopName}</h3>` : ''}
                </div>
                <div>
                    <h2>SALES INVOICE</h2>
                    ${invoiceSettings.showInvoiceId ? `<p><strong>Invoice ID:</strong> ${invoice.id}</p>` : ''}
                    ${invoiceSettings.showDate ? `<p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>` : ''}
                </div>
            </div>
            ${invoiceSettings.showBilledTo ? `
                <div class="invoice-customer">
                    <strong>Billed To:</strong> ${invoice.studentName}
                </div>
            ` : ''}
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th class="qty">Qty / Pages</th>
                        <th class="price">Unit Price</th>
                        <th class="price">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBody}
                </tbody>
                <tfoot>
                    ${tableFooter}
                </tfoot>
            </table>
            ${invoiceSettings.footerText ? `<div class="invoice-footer">${invoiceSettings.footerText}</div>` : ''}
        </div>
        ${isFinalized ? `
            <button class="button" id="reprint-invoice-btn" data-invoice-type="${isPhotocopy ? 'photocopy' : 'pos'}">Reprint Invoice</button>
            <button class="button" id="start-new-sale-btn" data-invoice-type="${isPhotocopy ? 'photocopy' : 'pos'}">Start New Sale</button>
        ` : `
            <button class="button" id="confirm-print-invoice-btn" data-invoice-type="${isPhotocopy ? 'photocopy' : 'pos'}">Confirm & Print</button>
            <button class="button secondary" id="cancel-sale-btn" data-invoice-type="${isPhotocopy ? 'photocopy' : 'pos'}">Cancel Sale</button>
        `}
    `;
}

function renderThermalReceiptHTML(invoice: any, settings: any): string {
    const { shopName, invoiceSettings } = settings;
    const itemsHtml = invoice.items.map((item: any) => `
        <tr>
            <td class="item-name">${item.name}<br><small>Qty: ${item.quantity} @ Rs ${item.price.toFixed(2)}</small></td>
            <td class="item-price">Rs ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${invoice.id}</title>
            <style>
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; }
                }
                body {
                    font-family: 'Courier New', monospace;
                    width: 80mm; /* Standard thermal printer width */
                    padding: 5mm;
                    font-size: 12px;
                    color: #000;
                    background-color: #fff;
                    box-sizing: border-box;
                }
                .receipt-header {
                    text-align: center;
                    margin-bottom: 10px;
                }
                .receipt-logo {
                    max-width: 60mm;
                    max-height: 40px;
                    margin-bottom: 5px;
                }
                .receipt-header h2 {
                    margin: 0;
                    font-size: 16px;
                }
                .receipt-header p {
                    margin: 2px 0;
                    font-size: 10px;
                }
                .invoice-details {
                    margin-bottom: 10px;
                    border-top: 1px dashed #000;
                    border-bottom: 1px dashed #000;
                    padding: 5px 0;
                }
                .invoice-details p {
                    margin: 2px 0;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .items-table th {
                    text-align: left;
                    border-bottom: 1px solid #000;
                    padding-bottom: 5px;
                }
                .items-table td {
                    padding: 5px 0;
                    vertical-align: top;
                }
                .item-name {
                    word-break: break-all;
                }
                .item-price {
                    text-align: right;
                    white-space: nowrap;
                    padding-left: 10px;
                }
                .totals {
                    margin-top: 10px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }
                .totals .total-row {
                    display: flex;
                    justify-content: space-between;
                }
                .totals .grand-total {
                    font-weight: bold;
                    font-size: 16px;
                    margin-top: 5px;
                }
                .paid-stamp {
                    text-align: center;
                    font-weight: bold;
                    font-size: 20px;
                    border: 2px dashed #000;
                    padding: 5px;
                    margin: 10px 0;
                    color: #000;
                }
                .paid-stamp p { margin: 0; }
                .receipt-footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 10px;
                }
                hr.dashed {
                    border: none;
                    border-top: 1px dashed #000;
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                ${invoiceSettings.logoUrl ? `<img src="${invoiceSettings.logoUrl}" alt="Logo" class="receipt-logo">` : ''}
                ${invoiceSettings.showShopName ? `<h2>${shopName}</h2>` : ''}
            </div>
            <div class="invoice-details">
                ${invoiceSettings.showInvoiceId ? `<p>Invoice: ${invoice.id}</p>` : ''}
                ${invoiceSettings.showDate ? `<p>Date: ${new Date(invoice.date).toLocaleString()}</p>` : ''}
                ${invoiceSettings.showBilledTo ? `<p>Billed To: ${invoice.studentName}</p>` : ''}
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="item-price">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div class="totals">
                <div class="total-row"><span>Subtotal</span><span>Rs ${invoice.subtotal.toFixed(2)}</span></div>
                ${invoice.discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span>-Rs ${invoice.discountAmount.toFixed(2)}</span></div>` : ''}
                ${invoice.taxAmount > 0 ? `<div class="total-row"><span>Tax</span><span>Rs ${invoice.taxAmount.toFixed(2)}</span></div>` : ''}
                <hr class="dashed">
                <div class="total-row grand-total">
                    <span>TOTAL</span>
                    <span>Rs ${invoice.total.toFixed(2)}</span>
                </div>
            </div>
            ${invoice.isFinalized ? `
            <div class="paid-stamp">
                <p>-- PAID --</p>
            </div>
            ` : ''}
             <div class="receipt-footer">
                ${invoiceSettings.footerText ? `<p>${invoiceSettings.footerText}</p>` : ''}
            </div>
        </body>
        </html>
    `;
}

function renderPhotocopyThermalReceiptHTML(invoice: any, settings: any): string {
    const { shopName, invoiceSettings } = settings;
    const itemsHtml = invoice.details.breakdown.map((item: any) => `
        <tr>
            <td class="item-name">${item.item}</td>
            <td class="item-price">Rs ${item.cost.toFixed(2)}</td>
        </tr>
    `).join('');

    // Reusing the same style block from renderThermalReceiptHTML
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${invoice.id}</title>
            <style>
                @media print { @page { margin: 0; } body { margin: 0; } }
                body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; font-size: 12px; color: #000; background-color: #fff; box-sizing: border-box; }
                .receipt-header { text-align: center; margin-bottom: 10px; }
                .receipt-logo { max-width: 60mm; max-height: 40px; margin-bottom: 5px; }
                .receipt-header h2 { margin: 0; font-size: 16px; }
                .receipt-header p { margin: 2px 0; font-size: 10px; }
                .invoice-details { margin-bottom: 10px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; }
                .invoice-details p { margin: 2px 0; }
                .items-table { width: 100%; border-collapse: collapse; }
                .items-table th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 5px; }
                .items-table td { padding: 5px 0; vertical-align: top; }
                .item-name { word-break: break-all; }
                .item-price { text-align: right; white-space: nowrap; padding-left: 10px; }
                .totals { margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
                .totals .total-row { display: flex; justify-content: space-between; }
                .totals .grand-total { font-weight: bold; font-size: 16px; margin-top: 5px; }
                .paid-stamp { text-align: center; font-weight: bold; font-size: 20px; border: 2px dashed #000; padding: 5px; margin: 10px 0; color: #000; }
                .paid-stamp p { margin: 0; }
                .receipt-footer { text-align: center; margin-top: 20px; font-size: 10px; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                ${invoiceSettings.logoUrl ? `<img src="${invoiceSettings.logoUrl}" alt="Logo" class="receipt-logo">` : ''}
                ${invoiceSettings.showShopName ? `<h2>${shopName}</h2>` : ''}
            </div>
            <div class="invoice-details">
                ${invoiceSettings.showInvoiceId ? `<p>Invoice: ${invoice.id}</p>` : ''}
                ${invoiceSettings.showDate ? `<p>Date: ${new Date(invoice.date).toLocaleString()}</p>` : ''}
                ${invoiceSettings.showBilledTo ? `<p>Billed To: ${invoice.studentName}</p>` : ''}
            </div>
            <table class="items-table">
                <thead><tr><th>Service</th><th class="item-price">Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="totals">
                <div class="total-row grand-total">
                    <span>TOTAL</span>
                    <span>Rs ${invoice.total.toFixed(2)}</span>
                </div>
            </div>
            ${invoice.isFinalized ? `<div class="paid-stamp"><p>-- PAID --</p></div>` : ''}
            <div class="receipt-footer">
                ${invoiceSettings.footerText ? `<p>${invoiceSettings.footerText}</p>` : ''}
            </div>
        </body>
        </html>
    `;
}

function renderDayClosureReceiptHTML(closure: any): string {
    const { shopName } = state.settings;
    const salesHtml = closure.salesInvoices.flatMap((sale: any) => {
        const typeMap: { [key: string]: string } = {
            photocopy: 'Service',
            printing: 'Printing',
            'pos': 'POS'
        };
        const mainRow = `
            <tr class="sale-main-row">
                <td>${sale.id}<br><small>${typeMap[sale.type] || 'POS'}</small></td>
                <td>${new Date(sale.date).toLocaleString()}</td>
                <td>${sale.studentName}</td>
                <td class="price">Rs ${sale.total.toFixed(2)}</td>
            </tr>
        `;
        const itemRows = (sale.items || []).map((item: any) => `
            <tr class="sale-item-row">
                <td class="item-detail-cell" colspan="4">
                    <div class="item-detail">
                        <span>${item.name}</span>
                        <span>Qty: ${item.quantity}</span>
                        <span class="price">Rs ${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                </td>
            </tr>
        `).join('');

        const photocopyRows = (sale.type === 'photocopy' ? sale.details.breakdown : []).map((detail: any) => `
             <tr class="sale-item-row">
                <td class="item-detail-cell" colspan="4">
                     <div class="item-detail">
                        <span>${detail.item}</span>
                        <span class="price">Rs ${detail.cost.toFixed(2)}</span>
                    </div>
                </td>
            </tr>
        `).join('');
    
        let summaryRows = '';
        if (sale.discountAmount > 0) {
            summaryRows += `
            <tr class="sale-summary-row">
                <td colspan="3">Discount</td>
                <td class="price">-Rs ${sale.discountAmount.toFixed(2)}</td>
            </tr>`;
        }
         if (sale.taxAmount > 0) {
            summaryRows += `
            <tr class="sale-summary-row">
                <td colspan="3">Tax</td>
                <td class="price">Rs ${sale.taxAmount.toFixed(2)}</td>
            </tr>`;
        }

        return [mainRow, itemRows, photocopyRows, summaryRows].join('');
    }).join('');

    const refundsHtml = closure.refundInvoices && closure.refundInvoices.length > 0 ? closure.refundInvoices.map((refund: any) => `
        <tr>
            <td>${refund.id}</td>
            <td>${new Date(refund.date).toLocaleTimeString()}</td>
            <td>${refund.originalSaleId}</td>
            <td class="price">-Rs ${refund.amount.toFixed(2)}</td>
        </tr>
    `).join('') : `<tr><td colspan="4">No refunds processed during this session.</td></tr>`;

    const netTotal = closure.totalSales - closure.totalRefunds;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Day Closure Report</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .report-container { background-color: white; max-width: 800px; margin: auto; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #0d47a1; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #0d47a1; font-size: 2.5em; }
                .header p { margin: 5px 0 0; font-size: 1.1em; color: #555; }
                h2, h3 { margin-top: 40px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 8px; color: #0d47a1; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em; }
                .details-table th, .details-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .details-table th { background-color: #f2f8ff; font-weight: bold; }
                td.price, th.price { text-align: right; font-family: 'Courier New', Courier, monospace; }
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; text-align: center; }
                .kpi-item { background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                .kpi-item.net-total { grid-column: 1 / -1; background-color: #e3f2fd; border-color: #90caf9; }
                .kpi-label { display: block; font-size: 0.9em; color: #666; margin-bottom: 5px; }
                .kpi-value { font-size: 1.8em; font-weight: bold; color: #333; }
                .kpi-value.positive { color: #2e7d32; }
                .kpi-value.negative { color: #c62828; }
                .net-total .kpi-value { color: #0d47a1; }
                .report-footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #888; }
                .details-table .sale-main-row td { background-color: #f7f9fc; font-weight: bold; }
                .details-table .sale-item-row td { padding-left: 30px; border-top: none; border-bottom: 1px dashed #e0e0e0; }
                .item-detail-cell { padding-top: 4px !important; padding-bottom: 4px !important; }
                .item-detail { display: flex; justify-content: space-between; width: 100%; font-size: 0.9em; color: #555; font-weight: normal; }
                .item-detail span:first-child { flex-grow: 1; }
                .details-table .sale-summary-row td { border-top: none; font-style: italic; font-weight: normal; text-align: right; padding-top: 2px; padding-bottom: 2px; }

                 @media print {
                    body { background-color: white; padding: 0; }
                    .report-container { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>${shopName}</h1>
                    <p>Daily Sales Summary</p>
                    <p><strong>Cashier:</strong> ${closure.userName} | <strong>Date:</strong> ${new Date(closure.date).toLocaleString()}</p>
                </div>
                
                <h3>Performance Summary</h3>
                <div class="kpi-grid">
                    <div class="kpi-item">
                        <span class="kpi-label">Total Sales</span>
                        <span class="kpi-value positive">Rs ${closure.totalSales.toFixed(2)}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Sales Transactions</span>
                        <span class="kpi-value">${closure.salesCount}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Total Refunds</span>
                        <span class="kpi-value negative">-Rs ${closure.totalRefunds.toFixed(2)}</span>
                    </div>
                     <div class="kpi-item">
                        <span class="kpi-label">Refund Transactions</span>
                        <span class="kpi-value">${closure.refundsCount}</span>
                    </div>
                    <div class="kpi-item net-total">
                        <span class="kpi-label">Net Sales</span>
                        <span class="kpi-value">Rs ${netTotal.toFixed(2)}</span>
                    </div>
                </div>

                <h2>Sales Transactions</h2>
                <table class="details-table">
                    <thead><tr><th>Invoice / Item Details</th><th>Date & Time</th><th>Customer</th><th class="price">Amount</th></tr></thead>
                    <tbody>${salesHtml.length > 0 ? salesHtml : `<tr><td colspan="4">No sales recorded during this session.</td></tr>`}</tbody>
                </table>
                
                <h2>Refunds & Cancellations</h2>
                <table class="details-table">
                     <thead><tr><th>Refund ID</th><th>Time</th><th>Original Sale ID</th><th class="price">Amount</th></tr></thead>
                    <tbody>${refundsHtml}</tbody>
                </table>

                <div class="report-footer">
                    <p>Report generated on ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderClosuresReportHTML(closures: any[], filterParams: any): string {
    const { shopName } = state.settings;
    const { startDate, endDate, userId, searchQuery } = filterParams;
    const user = state.users.find(u => u.id.toString() === userId);

    const filterSummary = [
        startDate && endDate ? `Period: ${startDate} to ${endDate}` : '',
        user ? `User: ${user.name}` : '',
        searchQuery ? `Search: "${searchQuery}"` : ''
    ].filter(Boolean).join(' | ');

    const closureRows = closures.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${new Date(c.date).toLocaleString()}</td>
            <td>${c.userName}</td>
            <td class="price">Rs ${c.totalSales.toFixed(2)}</td>
            <td class="price">-Rs ${c.totalRefunds.toFixed(2)}</td>
            <td class="price">Rs ${(c.totalSales - c.totalRefunds).toFixed(2)}</td>
            <td>${c.status}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Daily Closures Report</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .report-container { background-color: white; max-width: 800px; margin: auto; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #0d47a1; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #0d47a1; font-size: 2.5em; }
                .header p { margin: 5px 0 0; font-size: 1.1em; color: #555; }
                h2 { margin-top: 40px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 8px; color: #0d47a1; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em; }
                .details-table th, .details-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .details-table th { background-color: #f2f8ff; font-weight: bold; }
                td.price, th.price { text-align: right; font-family: 'Courier New', Courier, monospace; }
                .report-footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #888; }
                 @media print {
                    body { background-color: white; padding: 0; }
                    .report-container { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>${shopName}</h1>
                    <p>Daily Closures Report</p>
                    <p>${filterSummary}</p>
                </div>
                <h2>Closure Details</h2>
                <table class="details-table">
                    <thead><tr><th>ID</th><th>Date & Time</th><th>Cashier</th><th class="price">Gross Sales</th><th class="price">Refunds</th><th class="price">Net Total</th><th>Status</th></tr></thead>
                    <tbody>${closureRows}</tbody>
                </table>
                <div class="report-footer"><p>Report generated on ${new Date().toLocaleString()}</p></div>
            </div>
        </body>
        </html>
    `;
}

function renderFinanceReportHTMLPage(summary: any, startDate: string, endDate: string) {
    const { shopName } = state.settings;
    
    const salesRows = summary.sales.map((s: any) => `<tr><td>${s.id}</td><td>${new Date(s.date).toLocaleString()}</td><td>${s.studentName}</td><td class="price">Rs ${s.total.toFixed(2)}</td></tr>`).join('');
    const expensesRows = summary.expenses.map((e: any) => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.description}</td><td class="price">Rs ${e.amount.toFixed(2)}</td></tr>`).join('');

    return `
         <!DOCTYPE html>
        <html>
        <head>
            <title>Financial Report</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .report-container { background-color: white; max-width: 800px; margin: auto; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #0d47a1; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #0d47a1; font-size: 2.5em; }
                .header p { margin: 5px 0 0; font-size: 1.1em; color: #555; }
                h2 { margin-top: 40px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 8px; color: #0d47a1; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em; }
                .details-table th, .details-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .details-table th { background-color: #f2f8ff; font-weight: bold; }
                td.price, th.price { text-align: right; font-family: 'Courier New', Courier, monospace; }
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; text-align: center; }
                .kpi-item { background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                .kpi-item.net-total { grid-column: 1 / -1; background-color: #e3f2fd; border-color: #90caf9; }
                .kpi-label { display: block; font-size: 0.9em; color: #666; margin-bottom: 5px; }
                .kpi-value { font-size: 1.8em; font-weight: bold; color: #333; }
                .kpi-value.positive { color: #2e7d32; }
                .kpi-value.negative { color: #c62828; }
                .net-total .kpi-value { color: #0d47a1; }
                .report-footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #888; }
                 @media print {
                    body { background-color: white; padding: 0; }
                    .report-container { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; }
                }
            </style>
        </head>
        <body>
             <div class="report-container">
                <div class="header">
                    <h1>${shopName}</h1>
                    <p>Financial Summary Report</p>
                    <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                </div>
                <h2>Overall Summary</h2>
                 <div class="kpi-grid">
                    <div class="kpi-item"><span class="kpi-label">Net Revenue</span><span class="kpi-value positive">Rs ${summary.netRevenue.toFixed(2)}</span></div>
                    <div class="kpi-item"><span class="kpi-label">Total Expenses</span><span class="kpi-value negative">Rs ${summary.totalExpenses.toFixed(2)}</span></div>
                    <div class="kpi-item net-total"><span class="kpi-label">Net Profit</span><span class="kpi-value ${summary.netProfit >= 0 ? 'positive' : 'negative'}">Rs ${summary.netProfit.toFixed(2)}</span></div>
                </div>

                <h2>Sales Breakdown</h2>
                <table class="details-table">
                    <thead><tr><th>Invoice ID</th><th>Date/Time</th><th>Customer</th><th class="price">Total</th></tr></thead>
                    <tbody>${salesRows.length > 0 ? salesRows : '<tr><td colspan="4">No sales in this period.</td></tr>'}</tbody>
                </table>

                <h2>Expenses Breakdown</h2>
                 <table class="details-table">
                    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="price">Amount</th></tr></thead>
                    <tbody>${expensesRows.length > 0 ? expensesRows : '<tr><td colspan="4">No expenses in this period.</td></tr>'}</tbody>
                </table>

                <div class="report-footer">
                    <p>Report generated on ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderSalesHistoryReportHTML(sales: any[], startDate: string, endDate: string): string {
    const { shopName } = state.settings;
    const salesHtml = sales.map(sale => `
        <tr>
            <td>${sale.id}</td>
            <td>${new Date(sale.date).toLocaleString()}</td>
            <td>${sale.type === 'photocopy' ? 'Service Center' : 'POS Sale'}</td>
            <td>${sale.studentName}</td>
            <td class="price">Rs ${sale.total.toFixed(2)}</td>
        </tr>
    `).join('');
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales History Report</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .report-container { background-color: white; max-width: 800px; margin: auto; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #0d47a1; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #0d47a1; font-size: 2.5em; }
                .header p { margin: 5px 0 0; font-size: 1.1em; color: #555; }
                h2 { margin-top: 40px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 8px; color: #0d47a1; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em; }
                .details-table th, .details-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .details-table th { background-color: #f2f8ff; font-weight: bold; }
                td.price, th.price { text-align: right; font-family: 'Courier New', Courier, monospace; }
                .report-footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #888; }
                .grand-total-row { font-weight: bold; background-color: #f2f8ff; }
                 @media print {
                    body { background-color: white; padding: 0; }
                    .report-container { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>${shopName}</h1>
                    <p>Sales History Report</p>
                    <p><strong>Cashier:</strong> ${state.auth.user!.name}</p>
                    <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                </div>
                
                <h2>Sales Transactions</h2>
                <table class="details-table">
                    <thead><tr><th>Invoice ID</th><th>Date & Time</th><th>Type</th><th>Customer</th><th class="price">Total</th></tr></thead>
                    <tbody>${salesHtml}</tbody>
                    <tfoot>
                        <tr class="grand-total-row">
                            <td colspan="4">Total Revenue for Period</td>
                            <td class="price">Rs ${totalRevenue.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="report-footer">
                    <p>Report generated on ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderExpensesReportHTML(expenses: any[], filterParams: any): string {
    const { shopName } = state.settings;
    const { startDate, endDate, userId, searchQuery } = filterParams;
    const user = state.users.find(u => u.id.toString() === userId);

    const filterSummary = [
        startDate && endDate ? `Period: ${startDate} to ${endDate}` : '',
        user ? `User: ${user.name}` : '',
        searchQuery ? `Search: "${searchQuery}"` : ''
    ].filter(Boolean).join(' | ');

    const expenseRows = expenses.map(exp => `
        <tr>
            <td>${exp.date}</td>
            <td>${exp.category}</td>
            <td>${exp.description}</td>
            <td>${exp.userName}</td>
            <td class="price">Rs ${exp.amount.toFixed(2)}</td>
        </tr>
    `).join('');
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Expenses Report</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .report-container { background-color: white; max-width: 800px; margin: auto; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #0d47a1; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #0d47a1; font-size: 2.5em; }
                .header p { margin: 5px 0 0; font-size: 1.1em; color: #555; }
                h2 { margin-top: 40px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 8px; color: #0d47a1; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em; }
                .details-table th, .details-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .details-table th { background-color: #f2f8ff; font-weight: bold; }
                td.price, th.price { text-align: right; font-family: 'Courier New', Courier, monospace; }
                .report-footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #888; }
                .grand-total-row { font-weight: bold; background-color: #f2f8ff; }
                 @media print {
                    body { background-color: white; padding: 0; }
                    .report-container { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>${shopName}</h1>
                    <p>Expenses Report</p>
                    <p>${filterSummary}</p>
                </div>
                <h2>Expense Details</h2>
                <table class="details-table">
                    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Added By</th><th class="price">Amount</th></tr></thead>
                    <tbody>${expenseRows}</tbody>
                     <tfoot>
                        <tr class="grand-total-row">
                            <td colspan="4">Total Expenses</td>
                            <td class="price">Rs ${totalExpenses.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="report-footer"><p>Report generated on ${new Date().toLocaleString()}</p></div>
            </div>
        </body>
        </html>
    `;
}


function renderManagerView(isFrontDesk = false) {
    const ordersToDisplay = isFrontDesk ? 
        state.printOrders.filter(o => ['Pending', 'Printing', 'Ready for Pickup'].includes(o.status)) :
        state.printOrders;
    
    if (ordersToDisplay.length === 0) {
        return `<div class="card"><p>No ${isFrontDesk ? 'active' : 'past'} print orders found.</p></div>`;
    }

    return ordersToDisplay.map(order => `
        <div class="card order-card">
            <div class="order-card-header">
                <h3>Order #${order.id} - ${order.student.name}</h3>
                <span class="order-status-badge ${order.status.toLowerCase().replace(/ /g, '-')}">${order.status}</span>
            </div>
            <div class="order-card-body">
                <div class="order-details-col">
                    <h4>Files:</h4>
                    <ul class="file-list-manager">
                        ${order.files.map((file: any) => `<li>${file.name} (${(file.size / 1024).toFixed(1)} KB)</li>`).join('')}
                    </ul>
                     <h4>Printing Details:</h4>
                    <ul>
                        <li><strong>Pages:</strong> ${order.printDetails.pageCount}</li>
                        <li><strong>Copies:</strong> ${order.printDetails.copies}</li>
                        <li><strong>Color Mode:</strong> ${order.printDetails.colorMode}</li>
                        <li><strong>Paper Size:</strong> ${order.printDetails.paperSize}</li>
                        <li><strong>Paper Type:</strong> ${order.printDetails.paperType}</li>
                        <li><strong>Binding:</strong> ${order.printDetails.binding}</li>
                    </ul>
                     <div class="summary-box">
                       <strong>Summary:</strong> ${order.summary}
                    </div>
                </div>
                <div class="order-details-col">
                    <h4>Payment & Price:</h4>
                    <ul>
                        <li><strong>Total Price:</strong> <strong class="price total">Rs ${order.priceDetails.total.toFixed(2)}</strong></li>
                        <li><strong>Payment Method:</strong> ${order.payment.method}</li>
                        <li><strong>Payment Status:</strong> <span class="closure-status ${order.payment.status.toLowerCase()}">${order.payment.status}</span></li>
                    </ul>
                    <h4>Contact:</h4>
                    <ul>
                        <li><strong>Student ID:</strong> ${order.student.id}</li>
                        <li><strong>Email:</strong> <a href="mailto:${order.student.email}">${order.student.email}</a></li>
                        <li><strong>Phone:</strong> <a href="tel:${order.student.phone}">${order.student.phone}</a></li>
                    </ul>
                </div>
            </div>
            ${userHasPermission('frontdesk:update_status') ? `
            <div class="order-card-footer">
                 <div class="form-group" style="flex-grow: 1;">
                    <label for="status-update-${order.id}">Update Order Status:</label>
                    <select id="status-update-${order.id}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Printing" ${order.status === 'Printing' ? 'selected' : ''}>Printing</option>
                        <option value="Ready for Pickup" ${order.status === 'Ready for Pickup' ? 'selected' : ''}>Ready for Pickup</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
                <button class="button" data-update-order-status="${order.id}">Update Status</button>
            </div>` : ''}
        </div>
    `).join('');
}

function renderPrintOrderWizard() {
    let content;
    switch(state.printing.step) {
        case 'payment': content = renderPrintPaymentStep(); break;
        case 'confirmation': content = renderPrintConfirmationStep(); break;
        case 'details':
        default:
             content = renderPrintDetailsStep();
    }
    return `<div class="card">${content}</div>`;
}

function renderPrintDetailsStep() {
    const { printSettings } = state.settings;
    return `
        <h2>New Printing Order</h2>
        <form id="print-order-form">
            <div class="form-section">
                <h3>1. Student Information</h3>
                <div class="form-group search-container">
                    <label for="print-student-search">Search Registered Student (ID or Name)</label>
                    <input type="text" id="print-student-search" value="${state.printing.studentSearchQuery}" autocomplete="off">
                     <div class="search-results-list" id="print-student-search-results">
                        ${state.printing.studentSearchResults.map(s => `<div class="search-result-item" data-select-print-student='${JSON.stringify(s)}'>${s.name} (ID: ${s.id})</div>`).join('')}
                    </div>
                </div>
                 ${state.printing.selectedStudentId ? `
                    <div class="selected-student-info">
                        <p><strong>Selected Student:</strong> ${state.students.find(s=>s.id === state.printing.selectedStudentId)?.name} <button type="button" class="button-small" id="clear-print-student">Clear</button></p>
                    </div>
                ` : `
                    <p><em>Or enter details for a new/walk-in student:</em></p>
                    <div class="form-grid-2">
                         <div class="form-group"><label for="walkin-name">Full Name</label><input type="text" id="walkin-name" required></div>
                         <div class="form-group"><label for="walkin-email">Email</label><input type="email" id="walkin-email"></div>
                         <div class="form-group"><label for="walkin-phone">Phone</label><input type="tel" id="walkin-phone" required></div>
                    </div>
                `}
            </div>

            <div class="form-section">
                <h3>2. Upload Documents</h3>
                <div class="form-group">
                    <label for="file-upload">Select files to print</label>
                    <input type="file" id="file-upload" multiple>
                    <small>Supported formats: PDF, DOCX, JPG, PNG.</small>
                </div>
                <div class="file-list" id="file-list-container"></div>
            </div>
            
            <div class="form-section">
                <h3>3. Printing Options</h3>
                <div class="form-grid-3">
                    <div class="form-group"><label for="page-count">Total Page Count</label><input type="number" id="page-count" min="1" required></div>
                    <div class="form-group"><label for="copies">Number of Copies</label><input type="number" id="copies" min="1" value="1" required></div>
                    <div class="form-group"><label for="color-mode">Color Mode</label><select id="color-mode"><option value="bw">Black & White</option><option value="color">Color</option></select></div>
                    <div class="form-group"><label for="paper-size">Paper Size</label><select id="paper-size">${printSettings.paperSizes.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
                    <div class="form-group"><label for="paper-type">Paper Type</label><select id="paper-type">${printSettings.paperTypes.map(t => `<option value="${t.id}">${t.name} (+Rs ${t.extraCost.toFixed(2)})</option>`).join('')}</select></div>
                    <div class="form-group"><label for="binding">Binding</label><select id="binding">${printSettings.bindingTypes.map(b => `<option value="${b.id}">${b.name} (+Rs ${b.cost.toFixed(2)})</option>`).join('')}</select></div>
                </div>
            </div>
            
            <button type="submit" class="button">Calculate Price & Proceed to Payment</button>
        </form>
    `;
}

function renderPrintPaymentStep() {
    const { orderDetails, selectedPaymentMethod } = state.printing;
    if (!orderDetails) return `<p>Error: Order details not found.</p>`;
    
    const priceDetails = orderDetails.priceDetails;
    const selectedGateway = selectedPaymentMethod ? state.paymentGateways.find(p => p.id === selectedPaymentMethod) : null;
    
    return `
        <h2>Printing Order - Payment</h2>
        <div class="form-section price-summary-box">
            <h3>Price Summary</h3>
            <table class="price-table">
                <tbody>
                    <tr><td>Printing Cost (${priceDetails.pageCount} pages x ${priceDetails.copies} copies)</td><td class="price">Rs ${priceDetails.printCost.toFixed(2)}</td></tr>
                    <tr><td>Paper Surcharge</td><td class="price">Rs ${priceDetails.paperSurcharge.toFixed(2)}</td></tr>
                    <tr><td>Binding Cost</td><td class="price">Rs ${priceDetails.bindingCost.toFixed(2)}</td></tr>
                </tbody>
                <tfoot>
                    <tr><td>Total</td><td class="price total">Rs ${priceDetails.total.toFixed(2)}</td></tr>
                </tfoot>
            </table>
        </div>
        
        <div class="form-section">
            <h3>Select Payment Method</h3>
            <div class="payment-options">
                ${state.paymentGateways.filter(p => p.enabled).map(p => `
                    <button class="payment-option ${selectedPaymentMethod === p.id ? 'active' : ''}" data-payment-method="${p.id}">${p.name}</button>
                `).join('')}
            </div>
            ${selectedGateway ? `<div class="payment-details">${selectedGateway.details}</div>` : ''}
        </div>
        
        <div>
            <button class="button secondary" id="back-to-details">Back to Details</button>
            <button class="button" id="confirm-order-btn" ${!selectedPaymentMethod ? 'disabled' : ''}>Confirm Order</button>
        </div>
    `;
}

function renderPrintConfirmationStep() {
     const { orderDetails } = state.printing;
     if (!orderDetails) return ``;

    return `
        <h2>Order Confirmed!</h2>
        <div class="order-summary">
            <p><strong>Thank you!</strong> Your print order has been successfully submitted.</p>
            <p><strong>Order ID: #${orderDetails.id}</strong></p>
            <p>An email confirmation has been sent to <strong>${orderDetails.student.email}</strong>.</p>
            <p>The order will be ready for pickup once the status is updated to "Ready for Pickup".</p>
        </div>
        <button class="button" id="create-another-order">Create Another Print Order</button>
        <button class="button" data-module="frontdesk">Go to Front Desk</button>
    `;
}

function renderAdminUsersAndRoles() {
    const isUsersTab = state.admin.activeUsersTab === 'users';
    return `
        <h2>User & Role Management</h2>
        <nav class="admin-sub-nav">
             <button class="admin-sub-nav-button ${isUsersTab ? 'active' : ''}" data-admin-users-tab="users">Manage Users</button>
             <button class="admin-sub-nav-button ${!isUsersTab ? 'active' : ''}" data-admin-users-tab="roles">Manage Roles</button>
        </nav>
        ${isUsersTab ? renderAdminUsers() : renderAdminRoles()}
    `;
}

function renderAdminUsers() {
    const userRows = state.users.map(user => `
        <tr>
            <td>${user.id}</td><td>${user.name}</td><td>${user.email}</td>
            <td>${state.roles.find(r => r.id === user.roleId)?.name || 'N/A'}</td>
            <td>
                ${userHasPermission('admin:manage_users') ? `<button class="button-small" data-edit-user-id="${user.id}">Edit</button>` : ''}
                ${userHasPermission('admin:manage_users') && state.auth.user?.id !== user.id ? `<button class="button-small secondary" data-delete-user-id="${user.id}">Delete</button>` : ''}
            </td>
        </tr>`).join('');
    
    const editingUser = state.admin.editingUserId ? state.users.find(u => u.id === state.admin.editingUserId) : null;

    return `
        <div class="card">
            <h3>Users</h3>
            <table class="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>${userRows}</tbody>
            </table>
        </div>
         ${userHasPermission('admin:manage_users') ? `
        <div class="card">
            <h3>${editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form id="user-form" data-editing-id="${state.admin.editingUserId || ''}">
                 <div class="form-grid-2">
                    <div class="form-group"><label for="userName">Full Name</label><input type="text" id="userName" value="${editingUser?.name || ''}" required></div>
                    <div class="form-group"><label for="userEmail">Email</label><input type="email" id="userEmail" value="${editingUser?.email || ''}" required></div>
                    <div class="form-group"><label for="userPassword">Password</label><input type="password" id="userPassword" placeholder="${editingUser ? 'Leave blank to keep current password' : ''}" ${!editingUser ? 'required' : ''}></div>
                    <div class="form-group"><label for="userRole">Role</label><select id="userRole" required>
                        ${state.roles.map(r => `<option value="${r.id}" ${editingUser?.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select></div>
                </div>
                <button type="submit" class="button">${editingUser ? 'Update User' : 'Add User'}</button>
                 ${editingUser ? '<button type="button" class="button secondary" id="cancel-edit-user">Cancel Edit</button>' : ''}
            </form>
        </div>` : ''}
    `;
}

function formatRequestType(req: any) {
    switch (req.requestType) {
        case 'invoiceCancellation':
            return 'Invoice Cancellation';
        case 'discountAdjustment':
            return `Discount Adj. (Refund: Rs ${req.refundAmount.toFixed(2)})`;
        case 'itemReturn':
        default:
            return 'Item Return';
    }
}

function renderAdminReturns() {
    const returnRequests = state.returns;
    const returnRows = returnRequests.map(req => `
        <tr>
            <td>${req.id}</td>
            <td>${new Date(req.requestDate).toLocaleString()}</td>
            <td>${req.originalSaleId}</td>
            <td>${formatRequestType(req)}</td>
            <td>${req.requestedBy.name}</td>
            <td class="price">Rs ${req.totalAmount.toFixed(2)}</td>
            <td><span class="closure-status ${req.status.toLowerCase()}">${req.status}</span></td>
            <td>
                ${req.status === 'Pending' ? `
                    <button class="button-small" data-approve-request-id="${req.id}">Approve</button>
                    <button class="button-small secondary" data-reject-request-id="${req.id}">Reject</button>
                ` : (req.status === 'Approved' ? `By ${req.approvedBy.name}` : `By ${req.rejectedBy.name}`)}
            </td>
        </tr>
    `).join('');

    return `
        <div class="card">
            <h2>Manage Adjustment Requests</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Request ID</th>
                        <th>Date</th>
                        <th>Original Invoice</th>
                        <th>Request Type</th>
                        <th>Requested By</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${returnRows.length > 0 ? returnRows : `<tr><td colspan="8">No adjustment requests found.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function renderAdminRoles() {
    const roleRows = state.roles.map(role => `
        <tr>
            <td>${role.name}</td>
            <td>${role.permissions.length} permissions</td>
            <td>
                ${userHasPermission('admin:manage_roles') ? `<button class="button-small" data-edit-role-id="${role.id}">Edit</button>` : ''}
                ${userHasPermission('admin:manage_roles') && !['admin'].includes(role.id) ? `<button class="button-small secondary" data-delete-role-id="${role.id}">Delete</button>` : ''}
            </td>
        </tr>`).join('');
    
    const editingRole = state.admin.editingRoleId ? state.roles.find(r => r.id === state.admin.editingRoleId) : null;
    const groupedPermissions = Object.keys(state.permissions).reduce((acc, perm) => {
        const group = perm.split(':')[0];
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, string[]>);
    
    return `
         <div class="card">
            <h3>Roles</h3>
            <table class="data-table">
                <thead><tr><th>Role Name</th><th>Permissions</th><th>Actions</th></tr></thead>
                <tbody>${roleRows}</tbody>
            </table>
        </div>
         ${userHasPermission('admin:manage_roles') ? `
        <div class="card">
            <h3>${editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}</h3>
            <form id="role-form" data-editing-id="${state.admin.editingRoleId || ''}">
                <div class="form-group"><label for="roleName">Role Name</label><input type="text" id="roleName" value="${editingRole?.name || ''}" required></div>
                <h4>Permissions</h4>
                <div class="permissions-checklist">
                     ${Object.entries(groupedPermissions).map(([group, perms]) => `
                        <fieldset class="permission-group">
                            <legend>${group.charAt(0).toUpperCase() + group.slice(1)}</legend>
                            ${perms.map(p => `
                                <div class="checkbox-group">
                                    <input type="checkbox" id="perm-${p}" name="permissions" value="${p}" ${(editingRole?.permissions.includes(p)) ? 'checked' : ''}>
                                    <label for="perm-${p}">${state.permissions[p]}</label>
                                </div>
                            `).join('')}
                        </fieldset>
                    `).join('')}
                </div>
                <button type="submit" class="button">${editingRole ? 'Update Role' : 'Create Role'}</button>
                 ${editingRole ? '<button type="button" class="button secondary" id="cancel-edit-role">Cancel Edit</button>' : ''}
            </form>
        </div>` : ''}
    `;
}

function renderAdminPOSSettings() {
    const { posSettings } = state.settings;
    return `
        <h2>Point of Sale Settings</h2>
        <form id="pos-settings-form">
            <div class="card">
                <h3>General POS Behavior</h3>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label for="low-stock-threshold">Low Stock Threshold</label>
                        <input type="number" id="low-stock-threshold" value="${posSettings.lowStockThreshold}">
                        <small>Alerts will be shown for items at or below this stock level.</small>
                    </div>
                     <div class="form-group">
                        <label for="default-tax-rate">Default Tax Rate (%)</label>
                        <input type="number" id="default-tax-rate" step="0.1" value="${posSettings.defaultTaxRate}">
                        <small>The default tax rate applied to sales.</small>
                    </div>
                </div>
                 <div class="settings-toggle-grid">
                    <div class="setting-toggle">
                        <span>Allow Barcode Scanning</span>
                        <label class="switch"><input type="checkbox" id="allow-barcode-scanning" ${posSettings.allowBarcodeScanning ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                     <div class="setting-toggle">
                        <span>Allow Manual Item Search</span>
                        <label class="switch"><input type="checkbox" id="allow-manual-search" ${posSettings.allowManualSearch ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                     <div class="setting-toggle">
                        <span>Allow Customer Selection</span>
                        <label class="switch"><input type="checkbox" id="allow-customer-selection" ${posSettings.allowCustomerSelection ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                </div>
            </div>
            <button class="button" type="submit">Save POS Settings</button>
        </form>
    `;
}
function renderAdminPhotocopySettings() {
    const { photocopySettings } = state.settings;

    return `
        <h2>Service Center Settings</h2>
        <form id="photocopy-settings-form">
            <div class="card">
                <h3>Paper Sizes & Per-Page Pricing</h3>
                <p>Add, remove, or edit the available paper sizes and their costs.</p>
                <div id="photocopy-paper-sizes-container">
                    ${photocopySettings.paperSizes.map((size, index) => `
                        <div class="form-grid-4 dynamic-row" data-index="${index}">
                            <input type="text" name="paper_size_name" value="${size.name}" placeholder="Paper Size Name (e.g., A4)" required>
                            <input type="number" step="0.01" name="paper_size_bw" value="${size.bwPrice}" placeholder="B&W Price">
                            <input type="number" step="0.01" name="paper_size_color" value="${size.colorPrice}" placeholder="Color Price">
                            <button type="button" class="button-small secondary" data-remove-photocopy-paper-size="${index}">Remove</button>
                        </div>
                    `).join('')}
                 </div>
                 <button type="button" class="button" id="add-photocopy-paper-size">Add Paper Size</button>
            </div>

            <div class="card">
                 <h3>Paper Types & Surcharges</h3>
                 <p>Define paper options and any extra costs associated with them.</p>
                 <div id="photocopy-paper-types-container">
                    ${photocopySettings.paperTypes.map((type, index) => `
                        <div class="form-grid-3 dynamic-row" data-index="${index}">
                            <input type="text" name="paper_type_name" value="${type.name}" placeholder="Paper Type Name" required>
                            <input type="number" step="0.01" name="paper_type_cost" value="${type.extraCost}" placeholder="Extra Cost">
                            <button type="button" class="button-small secondary" data-remove-photocopy-paper-type="${index}">Remove</button>
                        </div>
                    `).join('')}
                 </div>
                 <button type="button" class="button" id="add-photocopy-paper-type">Add Paper Type</button>
            </div>

            <div class="card">
                <h3>Miscellaneous Service Costs</h3>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label for="cost-scan">Scan (per page)</label>
                        <input type="number" step="0.01" id="cost-scan" value="${photocopySettings.serviceCosts.scanPerPage}">
                    </div>
                    <div class="form-group">
                        <label for="cost-id-card">ID Card (per card)</label>
                        <input type="number" step="0.01" id="cost-id-card" value="${photocopySettings.serviceCosts.idCard}">
                    </div>
                    <div class="form-group">
                        <label for="cost-lamination">Lamination (per page)</label>
                        <input type="number" step="0.01" id="cost-lamination" value="${photocopySettings.serviceCosts.laminationPerPage}">
                    </div>
                     <div class="form-group">
                        <label for="cost-staple">Stapling (per set)</label>
                        <input type="number" step="0.01" id="cost-staple" value="${photocopySettings.serviceCosts.staplePerSet}">
                    </div>
                     <div class="form-group">
                        <label for="cost-urgent">Urgent Service Fee</label>
                        <input type="number" step="0.01" id="cost-urgent" value="${photocopySettings.serviceCosts.urgentFee}">
                    </div>
                </div>
            </div>

            <button class="button" type="submit">Save Service Center Settings</button>
        </form>
    `;
}


function renderAdminSettings() {
    const { settings } = state;
    return `
        <h2>Application Settings</h2>
        <form id="app-settings-form">
            <div class="card">
                <h3>Branding & General</h3>
                 <div class="form-grid-2">
                     <div class="form-group">
                        <label for="shop-name">Shop Name</label>
                        <input type="text" id="shop-name" value="${settings.shopName}">
                    </div>
                    <div class="form-group">
                        <label for="primary-color">Primary Color</label>
                        <input type="color" id="primary-color" value="${settings.theme.primaryColor}">
                    </div>
                 </div>
            </div>
            <div class="card">
                <h3>Enabled Modules</h3>
                <p>Select which modules are available in the application.</p>
                <div class="settings-toggle-grid">
                    ${Object.entries(settings.modules).map(([key, mod]) => `
                        <div class="setting-toggle">
                            <span>${mod.name}</span>
                            <label class="switch"><input type="checkbox" name="module-toggle" data-module-key="${key}" ${mod.enabled ? 'checked' : ''}><span class="slider round"></span></label>
                        </div>
                    `).join('')}
                </div>
            </div>

            <button class="button" type="submit">Save Application Settings</button>
        </form>
    `;
}

function renderAdminInvoiceSettings() {
    const { invoiceSettings } = state.settings;
    return `
        <h2>Invoice Customization</h2>
        <form id="invoice-settings-form">
            <div class="card">
                <h3>Invoice Content</h3>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label for="invoice-logo-url">Logo URL</label>
                        <input type="text" id="invoice-logo-url" value="${invoiceSettings.logoUrl}">
                        <small>Enter a full URL to an image. Leave blank for no logo.</small>
                    </div>
                    <div class="form-group">
                        <label for="invoice-footer-text">Footer Text</label>
                        <input type="text" id="invoice-footer-text" value="${invoiceSettings.footerText}">
                        <small>Text to show at the bottom of the invoice.</small>
                    </div>
                </div>
                 <h3>Invoice Elements</h3>
                <p>Toggle which elements to show on the generated invoices.</p>
                 <div class="settings-toggle-grid">
                    <div class="setting-toggle">
                        <span>Show Shop Name</span>
                        <label class="switch"><input type="checkbox" id="show-shop-name" ${invoiceSettings.showShopName ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                    <div class="setting-toggle">
                        <span>Show Invoice ID</span>
                        <label class="switch"><input type="checkbox" id="show-invoice-id" ${invoiceSettings.showInvoiceId ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                    <div class="setting-toggle">
                        <span>Show Date</span>
                        <label class="switch"><input type="checkbox" id="show-date" ${invoiceSettings.showDate ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                     <div class="setting-toggle">
                        <span>Show "Billed To" Section</span>
                        <label class="switch"><input type="checkbox" id="show-billed-to" ${invoiceSettings.showBilledTo ? 'checked' : ''}><span class="slider round"></span></label>
                    </div>
                </div>
            </div>
            <button class="button" type="submit">Save Invoice Settings</button>
        </form>
    `;
}


function renderAdminPrintingService() {
    const { printSettings } = state.settings;
    return `
        <h2>Printing Service Settings</h2>
        <form id="print-settings-form">
            <div class="card">
                <h3>Pricing</h3>
                <div class="form-grid-2">
                     <div class="form-group">
                        <label for="price-per-page-bw">Price per Page (B&W)</label>
                        <input type="number" id="price-per-page-bw" step="0.01" value="${printSettings.perPage.bw}">
                    </div>
                    <div class="form-group">
                        <label for="price-per-page-color">Price per Page (Color)</label>
                        <input type="number" id="price-per-page-color" step="0.01" value="${printSettings.perPage.color}">
                    </div>
                </div>
            </div>
            <div class="card">
                 <h3>Paper Types</h3>
                 <div id="paper-types-container">
                    ${printSettings.paperTypes.map((type, index) => `
                        <div class="form-grid-3 dynamic-row" data-index="${index}">
                            <input type="text" value="${type.name}" placeholder="Paper Type Name">
                            <input type="number" step="0.01" value="${type.extraCost}" placeholder="Extra Cost">
                            <button type="button" class="button-small secondary" data-remove-paper-type="${index}">Remove</button>
                        </div>
                    `).join('')}
                 </div>
                 <button type="button" class="button" id="add-paper-type">Add Paper Type</button>
            </div>
             <div class="card">
                 <h3>Binding Types</h3>
                 <div id="binding-types-container">
                    ${printSettings.bindingTypes.map((type, index) => `
                        <div class="form-grid-3 dynamic-row" data-index="${index}">
                            <input type="text" value="${type.name}" placeholder="Binding Type Name">
                            <input type="number" step="0.01" value="${type.cost}" placeholder="Cost">
                            <button type="button" class="button-small secondary" data-remove-binding-type="${index}">Remove</button>
                        </div>
                    `).join('')}
                 </div>
                 <button type="button" class="button" id="add-binding-type">Add Binding Type</button>
            </div>
            <button class="button" type="submit">Save Print Settings</button>
        </form>
    `;
}

function renderAdminPaymentGateways() {
    return `
        <h2>Payment Gateways</h2>
        <form id="payment-gateways-form">
            ${state.paymentGateways.map(gateway => `
                <div class="card">
                    <h3>${gateway.name}</h3>
                    <div class="setting-toggle">
                        <span>Enable ${gateway.name}</span>
                        <label class="switch">
                            <input type="checkbox" data-gateway-id="${gateway.id}" data-field="enabled" ${gateway.enabled ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    ${gateway.id === 'stripe' ? `
                    <div class="setting-toggle">
                        <span>Enable Test Mode</span>
                        <label class="switch">
                            <input type="checkbox" data-gateway-id="${gateway.id}" data-field="isTestMode" ${gateway.isTestMode ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    ` : ''}
                    <div class="form-group" style="margin-top: 1rem;">
                        <label for="details-${gateway.id}">Display Details (HTML)</label>
                        <textarea id="details-${gateway.id}" data-gateway-id="${gateway.id}" data-field="details" rows="5">${gateway.details}</textarea>
                    </div>
                </div>
            `).join('')}
            <button class="button" type="submit">Save Gateway Settings</button>
        </form>
    `;
}

function renderAdminAuditLog() {
    if (!userHasPermission('admin:view_audit_log')) {
        return `<div class="card"><p>You do not have permission to view the audit log.</p></div>`;
    }

    const { auditLogFilterUserId, auditLogFilterStartDate, auditLogFilterEndDate } = state.admin;

    const filteredLogs = state.auditLog.filter(log => {
        if (auditLogFilterUserId && log.userId !== parseInt(auditLogFilterUserId, 10)) {
            return false;
        }
        if (auditLogFilterStartDate) {
            const logDate = log.timestamp.split('T')[0];
            if (logDate < auditLogFilterStartDate) return false;
        }
        if (auditLogFilterEndDate) {
            const logDate = log.timestamp.split('T')[0];
            if (logDate > auditLogFilterEndDate) return false;
        }
        return true;
    });

    const logRows = filteredLogs.map(log => `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.userName} (ID: ${log.userId})</td>
            <td>${log.action}</td>
            <td>${log.details}</td>
        </tr>
    `).join('');

    return `
        <div class="card">
            <h2>System Audit Log</h2>
            <form id="audit-log-filter-form">
                <div class="form-grid-3">
                    <div class="form-group">
                        <label for="audit-log-user-filter">Filter by User</label>
                        <select id="audit-log-user-filter" name="userId">
                            <option value="">All Users</option>
                            ${state.users.map(u => `<option value="${u.id}" ${auditLogFilterUserId === String(u.id) ? 'selected' : ''}>${u.name}</option>`).join('')}
                        </select>
                    </div>
                     <div class="form-group">
                        <label for="audit-log-start-date">Start Date</label>
                        <input type="date" id="audit-log-start-date" name="startDate" value="${auditLogFilterStartDate}">
                    </div>
                    <div class="form-group">
                        <label for="audit-log-end-date">End Date</label>
                        <input type="date" id="audit-log-end-date" name="endDate" value="${auditLogFilterEndDate}">
                    </div>
                </div>
                <div class="reporting-actions" style="justify-content: flex-start;">
                    <button type="submit" class="button">Filter Logs</button>
                    <button type="button" class="button secondary" id="reset-audit-log-filter">Reset Filters</button>
                </div>
            </form>
        </div>
        <div class="card">
            <h3>Log Entries</h3>
             <div class="table-container" style="max-height: 60vh; overflow-y: auto;">
                <table class="data-table">
                    <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                    <tbody>
                        ${logRows.length > 0 ? logRows : '<tr><td colspan="4">No log entries found for the selected filters.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 5. --- CORE UTILITIES, RENDER CYCLE, AND BOOTSTRAP ---

function printReceipt(htmlContent: string, windowFeatures = 'width=302,height=500') {
    const newWindow = window.open('', '_blank', windowFeatures);
    if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.print();
    }
}

function applyTheme() {
    const primaryColor = state.settings.theme.primaryColor;
    document.documentElement.style.setProperty('--primary-color', primaryColor);
}

function createFinanceCharts() {
    // Destroy existing charts to prevent duplicates
    Object.values(financeChartInstances).forEach(chart => chart.destroy());
    financeChartInstances = {};

    const { reportStartDate, reportEndDate } = state.finance;
    const summary = calculateFinancialSummary(reportStartDate, reportEndDate);

    // Revenue vs Expense Chart
    const revExpCtx = document.getElementById('revenue-expense-chart') as HTMLCanvasElement;
    if (revExpCtx) {
        financeChartInstances.revExp = new Chart(revExpCtx, {
            type: 'bar',
            data: {
                labels: ['Summary'],
                datasets: [
                    {
                        label: 'Net Revenue',
                        data: [summary.netRevenue],
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Total Expenses',
                        data: [summary.totalExpenses],
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });
    }

    // Expense Category Chart
    const expCatCtx = document.getElementById('expense-category-chart') as HTMLCanvasElement;
    if (expCatCtx) {
        const expenseByCategory = summary.expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        financeChartInstances.expCat = new Chart(expCatCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(expenseByCategory),
                datasets: [{
                    label: 'Expenses',
                    data: Object.values(expenseByCategory),
                    hoverOffset: 4
                }]
            }
        });
    }
}
/**
 * Updates the "Billed To" section in the POS without a full re-render.
 */
function updatePOSCustomerDisplay() {
    const customerContainer = document.querySelector('#pos-customer-card > div:last-child');
    if (customerContainer) {
        const newHTML = `<strong>Billed To:</strong> <span id="pos-current-customer">${state.pos.selectedStudent?.name || state.pos.manualCustomerName || 'Walk-in Customer'}</span>
                        ${state.pos.selectedStudent ? `<button class="button-small" id="pos-clear-student">Clear</button>` : ''}`;
        customerContainer.innerHTML = newHTML;
    }
}

/**
 * Updates only the cart summary and total in the POS view.
 */
function updateCartSummaryDOM() {
    const totals = calculateCartTotals();
    
    const summaryDiv = document.querySelector('.cart-summary');
    if (summaryDiv) {
        const subtotalEl = summaryDiv.querySelector('div:nth-child(1) span.price') as HTMLElement | null;
        if(subtotalEl) subtotalEl.innerText = `Rs ${totals.subtotal.toFixed(2)}`;

        const taxEl = summaryDiv.querySelector('div:nth-child(4) span.price') as HTMLElement | null;
        if(taxEl) taxEl.innerText = `Rs ${totals.taxAmount.toFixed(2)}`;
    }
    
    const totalDiv = document.getElementById('cart-total');
    if (totalDiv) {
        totalDiv.innerText = `Total: Rs ${totals.total.toFixed(2)}`;
    }
}

/**
 * Updates only the cart items list and the summary/total in the POS view.
 */
function updateCartDOM() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        const cartItemsHTML = state.pos.cart.map(item => `
            <li class="cart-item">
                 <div class="cart-item-details">
                    <span>${item.name}</span>
                    <span class="cart-item-line-total">Rs ${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div class="cart-item-actions">
                     <button class="button-small" data-decrease-qty="${item.isbn}">-</button>
                     <span class="cart-item-quantity">${item.quantity}</span>
                     <button class="button-small" data-increase-qty="${item.isbn}">+</button>
                     <button class="button-small secondary" data-remove-cart-item="${item.isbn}">X</button>
                </div>
            </li>`).join('');
        
        cartItemsContainer.innerHTML = cartItemsHTML.length > 0 ? cartItemsHTML : '<li>Cart is empty.</li>';
    }

    updateCartSummaryDOM();

    const checkoutBtn = document.getElementById('checkout-btn') as HTMLButtonElement | null;
    const cancelSaleBtn = document.getElementById('cancel-current-sale-btn') as HTMLButtonElement | null;
    if (checkoutBtn) checkoutBtn.disabled = state.pos.cart.length === 0;
    if (cancelSaleBtn) cancelSaleBtn.disabled = state.pos.cart.length === 0;
}


/**
 * Updates only the order summary in the Service Center (Photocopy) view.
 */
function updatePhotocopySummaryDOM() {
    const totals = calculatePhotocopyTotals();
    const summaryContainer = document.getElementById('photocopy-summary-container');
    if (!summaryContainer) return;

    const tableBodyHTML = totals.breakdown.map(item => `
        <tr>
            <td>${item.item}</td>
            <td class="price">Rs ${item.cost.toFixed(2)}</td>
        </tr>
    `).join('');

    const tbody = summaryContainer.querySelector('.photocopy-summary-table tbody');
    if(tbody) tbody.innerHTML = tableBodyHTML;
    
    const totalEl = summaryContainer.querySelector('#cart-total');
    if(totalEl) totalEl.innerHTML = `Total: Rs ${totals.total.toFixed(2)}`;

    const checkoutBtn = summaryContainer.querySelector('#photocopy-checkout-btn') as HTMLButtonElement | null;
    if(checkoutBtn) checkoutBtn.disabled = totals.total <= 0;
}

/**
 * Updates only the item search results list in the POS view.
 */
function updatePOSItemSearchResultsDOM() {
    const resultsContainer = document.getElementById('pos-manual-search-results');
    if (resultsContainer) {
        const resultsHTML = state.pos.manualSearchResults.map(item => 
            `<div class="search-result-item" data-add-manual-item="${item.isbn}">${item.name} - Rs ${item.price.toFixed(2)} (${item.stock} in stock)</div>`
        ).join('');
        resultsContainer.innerHTML = resultsHTML;
    }
}

/**
 * Updates only the student search results list in the POS view.
 */
function updatePOSStudentSearchResultsDOM() {
    const resultsContainer = document.getElementById('pos-student-search-results');
    if (resultsContainer) {
        const resultsHTML = state.pos.studentSearchResults.map(s => 
            `<div class="search-result-item" data-select-pos-student='${JSON.stringify({id: s.id, name: s.name})}'>${s.name} (ID: ${s.id})</div>`
        ).join('');
        resultsContainer.innerHTML = resultsHTML;
    }
}


function render() {
    // Destroy old charts before re-rendering finance view
    if (state.activeModule !== 'finance' && Object.keys(financeChartInstances).length > 0) {
        Object.values(financeChartInstances).forEach(chart => chart.destroy());
        financeChartInstances = {};
    }

    if (state.currentView === 'login') {
        root.innerHTML = renderLoginView();
    } else if (state.currentView === 'signup') {
        root.innerHTML = renderSignupView();
    } else {
        root.innerHTML = renderAppView();
    }
    attachEventListeners();

    // After render, if finance charts need to be created
    if (state.activeModule === 'finance' && state.finance.activeTab === 'reporting' && userHasPermission('finance:run_reports')) {
        setTimeout(createFinanceCharts, 0); // Use timeout to ensure canvas is in the DOM
    }
}

function init() {
    applyTheme();
    render();
}

// 6. --- EVENT HANDLER SETUP ---
function attachEventListeners() {
    const el = document.getElementById("root")!;
    el.removeEventListener("click", handleGlobalClick);
    el.removeEventListener("submit", handleGlobalSubmit);
    el.removeEventListener("input", handleGlobalInput);
    el.removeEventListener("change", handleGlobalChange);

    el.addEventListener("click", handleGlobalClick);
    el.addEventListener("submit", handleGlobalSubmit);
    el.addEventListener("input", handleGlobalInput);
    el.addEventListener("change", handleGlobalChange);
}

function handleGlobalClick(e: Event) {
    const target = e.target as HTMLElement;

    // Auth
    if (target.id === 'show-signup') { e.preventDefault(); state.currentView = 'signup'; render(); }
    if (target.id === 'show-login') { e.preventDefault(); state.currentView = 'login'; render(); }
    if (target.id === 'logout-btn') { handleLogout(); }

    // Navigation
    const navButton = target.closest('.app-nav-button');
    if (navButton) { state.activeModule = navButton.getAttribute('data-module')!; render(); }
    const dashCard = target.closest('.dashboard-card');
    if (dashCard) { state.activeModule = dashCard.getAttribute('data-module')!; render(); }

    // Inventory
    const editInvBtn = target.closest('[data-edit-inventory]');
    if (editInvBtn) { state.admin.editingInventoryId = editInvBtn.getAttribute('data-edit-inventory'); render(); }
    if (target.id === 'cancel-edit-inventory') { state.admin.editingInventoryId = null; render(); }
    const deleteInvBtn = target.closest('[data-delete-inventory]');
    if (deleteInvBtn) { handleDeleteInventory(deleteInvBtn.getAttribute('data-delete-inventory')!); }
    
    // Student
    const editStudentBtn = target.closest('[data-edit-student-id]');
    if (editStudentBtn) { state.admin.editingStudentId = parseInt(editStudentBtn.getAttribute('data-edit-student-id')!, 10); render(); }
    if (target.id === 'cancel-edit-student') { state.admin.editingStudentId = null; render(); }
    const deleteStudentBtn = target.closest('[data-delete-student-id]');
    if (deleteStudentBtn) { handleDeleteStudent(parseInt(deleteStudentBtn.getAttribute('data-delete-student-id')!, 10)); }


    // Finance
    const financeTabBtn = target.closest('[data-finance-tab]');
    if (financeTabBtn) { state.finance.activeTab = financeTabBtn.getAttribute('data-finance-tab')!; render(); }
    const viewClosureBtn = target.closest('[data-view-closure-id]');
    if (viewClosureBtn) { handleViewClosure(viewClosureBtn.getAttribute('data-view-closure-id')!); }
    if (target.id === 'cancel-view-closure' || target.classList.contains('finance-modal-overlay')) { state.finance.viewingClosure = null; render(); }
    if (target.id === 'confirm-receive-closure') { handleReceiveClosure(target.dataset.closureId!); }
    if (target.id === 'export-finance-pdf') { handleExportFinanceReportPDF(); }
    if (target.id === 'export-finance-csv') { handleExportFinanceReportCSV(); }
    if (target.id === 'reset-closure-filters') {
        state.finance.closureFilterStartDate = '';
        state.finance.closureFilterEndDate = '';
        state.finance.closureFilterUserId = '';
        state.finance.closureFilterSearchQuery = '';
        render();
    }
    if (target.id === 'export-closures-pdf') { handleExportClosuresPDF(); }
    if (target.id === 'export-closures-csv') { handleExportClosuresCSV(); }

    // Finance Expenses
    const editExpenseBtn = target.closest('[data-edit-expense-id]');
    if (editExpenseBtn) { handleEditExpenseClick(editExpenseBtn.getAttribute('data-edit-expense-id')!); }
    const deleteExpenseBtn = target.closest('[data-delete-expense-id]');
    if (deleteExpenseBtn) { handleDeleteExpense(deleteExpenseBtn.getAttribute('data-delete-expense-id')!); }
    if (target.id === 'cancel-edit-expense') { state.finance.editingExpenseId = null; render(); }
    if (target.id === 'reset-expense-filters') {
        state.finance.expenseFilterStartDate = '';
        state.finance.expenseFilterEndDate = '';
        state.finance.expenseFilterUserId = '';
        state.finance.expenseFilterSearchQuery = '';
        render();
    }
    if (target.id === 'export-expenses-pdf') { handleExportExpensesPDF(); }
    if (target.id === 'export-expenses-csv') { handleExportExpensesCSV(); }


    // POS
    if (target.id === 'start-scan-btn') { startBarcodeScanner(); }
    if (target.id === 'stop-scan-btn') { stopBarcodeScanner(); }
    const addItemFromListBtn = target.closest('[data-add-item-from-list]');
    if (addItemFromListBtn) { handleAddItemToCart(addItemFromListBtn.getAttribute('data-add-item-from-list')!); }
    const addManualItemBtn = target.closest('[data-add-manual-item]');
    if (addManualItemBtn) { handleAddItemToCart(addManualItemBtn.getAttribute('data-add-manual-item')!); }
    const selectPosStudent = target.closest('[data-select-pos-student]');
    if (selectPosStudent) { handleSelectPosStudent(JSON.parse(selectPosStudent.getAttribute('data-select-pos-student')!)); }
    if (target.id === 'pos-clear-student') { state.pos.selectedStudent = null; render(); }
    const decreaseQtyBtn = target.closest('[data-decrease-qty]');
    if (decreaseQtyBtn) { handleUpdateCartQuantity(decreaseQtyBtn.getAttribute('data-decrease-qty')!, -1); }
    const increaseQtyBtn = target.closest('[data-increase-qty]');
    if (increaseQtyBtn) { handleUpdateCartQuantity(increaseQtyBtn.getAttribute('data-increase-qty')!, 1); }
    const removeCartItemBtn = target.closest('[data-remove-cart-item]');
    if (removeCartItemBtn) { handleRemoveFromCart(removeCartItemBtn.getAttribute('data-remove-cart-item')!); }
    if (target.id === 'checkout-btn') { handleCheckout(); }
    if (target.id === 'cancel-current-sale-btn') { handleCancelCurrentSale(); }
    const posTabBtn = target.closest('[data-pos-tab]');
    if (posTabBtn) { state.pos.activeTab = posTabBtn.getAttribute('data-pos-tab')!; render(); }
    if (target.id === 'close-day-sale-btn') { handleShowClosureModal(); }
    if (target.id === 'cancel-closure' || target.id === 'closure-modal-overlay') { state.pos.showClosureModal = false; state.pos.closurePreview = null; render(); }
    if (target.id === 'confirm-closure') { handleCloseDaySale(); }
    if (target.id === 'filter-sales-history-btn') { handleFilterSalesHistory(); }
    if (target.id === 'export-history-pdf-btn') { handleExportHistoryPDF(); }
    if (target.id === 'export-history-csv-btn') { handleExportHistoryCSV(); }


    // POS Adjustment Requests
    const actionReturnBtn = target.closest('[data-action-return-sale-id]');
    if (actionReturnBtn) { handleRequestAdjustment(actionReturnBtn.getAttribute('data-action-return-sale-id')!, 'return'); }
    const actionCancelBtn = target.closest('[data-action-cancel-sale-id]');
    if (actionCancelBtn) { handleRequestAdjustment(actionCancelBtn.getAttribute('data-action-cancel-sale-id')!, 'cancel'); }
    const actionDiscountBtn = target.closest('[data-action-discount-sale-id]');
    if (actionDiscountBtn) { handleRequestAdjustment(actionDiscountBtn.getAttribute('data-action-discount-sale-id')!, 'adjustDiscount'); }
    if (target.id === 'cancel-adjustment-request' || target.id === 'adjustment-modal-overlay') { state.pos.adjustmentModalData = null; render(); }


    // Invoice
    if (target.id === 'confirm-print-invoice-btn') { handleConfirmAndPrintInvoice(target.dataset.invoiceType!); }
    if (target.id === 'cancel-sale-btn') { handleCancelSale(target.dataset.invoiceType!); }
    if (target.id === 'start-new-sale-btn') { handleStartNewSale(target.dataset.invoiceType!); }
    if (target.id === 'reprint-invoice-btn') { handleReprintInvoice(target.dataset.invoiceType!); }

    // Photocopy
    if (target.id === 'photocopy-checkout-btn') { handlePhotocopyCheckout(); }

    // Admin
    const adminViewBtn = target.closest('[data-admin-view]');
    if (adminViewBtn) { state.admin.currentView = adminViewBtn.getAttribute('data-admin-view')!; render(); }
    const adminUsersTabBtn = target.closest('[data-admin-users-tab]');
    if (adminUsersTabBtn) { state.admin.activeUsersTab = adminUsersTabBtn.getAttribute('data-admin-users-tab')!; render(); }
    
    // Admin Users & Roles
    const editUserBtn = target.closest('[data-edit-user-id]');
    if (editUserBtn) { state.admin.editingUserId = parseInt(editUserBtn.getAttribute('data-edit-user-id')!, 10); render(); }
    if (target.id === 'cancel-edit-user') { state.admin.editingUserId = null; render(); }
    const deleteUserBtn = target.closest('[data-delete-user-id]');
    if (deleteUserBtn) { handleDeleteUser(parseInt(deleteUserBtn.getAttribute('data-delete-user-id')!, 10)); }
    const editRoleBtn = target.closest('[data-edit-role-id]');
    if (editRoleBtn) { state.admin.editingRoleId = editRoleBtn.getAttribute('data-edit-role-id')!; render(); }
    if (target.id === 'cancel-edit-role') { state.admin.editingRoleId = null; render(); }
    const deleteRoleBtn = target.closest('[data-delete-role-id]');
    if (deleteRoleBtn) { handleDeleteRole(deleteRoleBtn.getAttribute('data-delete-role-id')!); }
    
    // Admin Adjustment Requests
    const approveRequestBtn = target.closest('[data-approve-request-id]');
    if (approveRequestBtn) { handleApproveRequest(approveRequestBtn.getAttribute('data-approve-request-id')!); }
    const rejectRequestBtn = target.closest('[data-reject-request-id]');
    if (rejectRequestBtn) { handleRejectRequest(rejectRequestBtn.getAttribute('data-reject-request-id')!); }

    // Admin Audit Log
    if (target.id === 'reset-audit-log-filter') {
        state.admin.auditLogFilterUserId = '';
        state.admin.auditLogFilterStartDate = '';
        state.admin.auditLogFilterEndDate = '';
        render();
    }


    // Print Service
    if (target.id === 'start-new-print-order') { state.printing.step = 'details'; resetPrintingState(); render(); }
    const selectPrintStudent = target.closest('[data-select-print-student]');
    if (selectPrintStudent) { handleSelectPrintStudent(JSON.parse(selectPrintStudent.getAttribute('data-select-print-student')!)); }
    if (target.id === 'clear-print-student') { state.printing.selectedStudentId = null; render(); }
    if (target.id === 'back-to-details') { state.printing.step = 'details'; render(); }
    if (target.id === 'confirm-order-btn') { handleConfirmPrintOrder(); }
    if (target.id === 'create-another-order') { resetPrintingState(); state.printing.step = 'details'; render(); }
    const paymentMethodBtn = target.closest('[data-payment-method]');
    if (paymentMethodBtn) { state.printing.selectedPaymentMethod = paymentMethodBtn.getAttribute('data-payment-method')!; render(); }
    const updateStatusBtn = target.closest('[data-update-order-status]');
    if (updateStatusBtn) { handleUpdateOrderStatus(updateStatusBtn.getAttribute('data-update-order-status')!); }

    // Admin Print Settings
    if(target.id === 'add-paper-type') { state.settings.printSettings.paperTypes.push({id: `new${Date.now()}`, name: '', extraCost: 0}); render(); }
    const removePaperTypeBtn = target.closest('[data-remove-paper-type]');
    if(removePaperTypeBtn) { state.settings.printSettings.paperTypes.splice(parseInt((removePaperTypeBtn as HTMLElement).dataset.removePaperType!), 1); render(); }
    if(target.id === 'add-binding-type') { state.settings.printSettings.bindingTypes.push({id: `new${Date.now()}`, name: '', cost: 0}); render(); }
    const removeBindingTypeBtn = target.closest('[data-remove-binding-type]');
    if(removeBindingTypeBtn) { state.settings.printSettings.bindingTypes.splice(parseInt((removeBindingTypeBtn as HTMLElement).dataset.removeBindingType!), 1); render(); }

    // Admin Photocopy Settings
    if (target.id === 'add-photocopy-paper-size') {
        state.settings.photocopySettings.paperSizes.push({id: `new-size-${Date.now()}`, name: '', bwPrice: 0, colorPrice: 0});
        render();
    }
    const removePhotocopyPaperSizeBtn = target.closest('[data-remove-photocopy-paper-size]');
    if (removePhotocopyPaperSizeBtn) {
        state.settings.photocopySettings.paperSizes.splice(parseInt(removePhotocopyPaperSizeBtn.getAttribute('data-remove-photocopy-paper-size')!), 1);
        render();
    }
    if (target.id === 'add-photocopy-paper-type') {
        state.settings.photocopySettings.paperTypes.push({id: `new-type-${Date.now()}`, name: '', extraCost: 0});
        render();
    }
    const removePhotocopyPaperTypeBtn = target.closest('[data-remove-photocopy-paper-type]');
    if (removePhotocopyPaperTypeBtn) {
        state.settings.photocopySettings.paperTypes.splice(parseInt(removePhotocopyPaperTypeBtn.getAttribute('data-remove-photocopy-paper-type')!), 1);
        render();
    }
}

function handleGlobalSubmit(e: Event) {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    if (target.id === 'login-form') { handleLogin(target); }
    if (target.id === 'signup-form') { handleSignup(target); }
    if (target.id === 'inventory-form') { handleInventorySubmit(target); }
    if (target.id === 'student-form') { handleStudentSubmit(target); }
    if (target.id === 'add-expense-form') { handleExpenseSubmit(target); }
    if (target.id === 'expense-filter-form') {
        state.finance.expenseFilterStartDate = (target.elements.namedItem('startDate') as HTMLInputElement).value;
        state.finance.expenseFilterEndDate = (target.elements.namedItem('endDate') as HTMLInputElement).value;
        state.finance.expenseFilterUserId = (target.elements.namedItem('userId') as HTMLSelectElement).value;
        state.finance.expenseFilterSearchQuery = (target.elements.namedItem('searchQuery') as HTMLInputElement).value;
        render();
    }
    if (target.id === 'closure-filter-form') {
        state.finance.closureFilterStartDate = (target.elements.namedItem('startDate') as HTMLInputElement).value;
        state.finance.closureFilterEndDate = (target.elements.namedItem('endDate') as HTMLInputElement).value;
        state.finance.closureFilterUserId = (target.elements.namedItem('userId') as HTMLSelectElement).value;
        state.finance.closureFilterSearchQuery = (target.elements.namedItem('searchQuery') as HTMLInputElement).value;
        render();
    }
    if (target.id === 'role-form') { handleRoleSubmit(target); }
    if (target.id === 'user-form') { handleUserSubmit(target); }
    if (target.id === 'pos-settings-form') { handleSavePOSSettings(target); }
    if (target.id === 'photocopy-settings-form') { handleSavePhotocopySettings(target); }
    if (target.id === 'app-settings-form') { handleSaveAppSettings(target); }
    if (target.id === 'invoice-settings-form') { handleSaveInvoiceSettings(target); }
    if (target.id === 'print-settings-form') { handleSavePrintSettings(target); }
    if (target.id === 'payment-gateways-form') { handleSavePaymentGateways(target); }
    if (target.id === 'print-order-form') { handlePrintOrderSubmit(target); }
    if (target.id === 'adjustment-request-form') { handleSubmitAdjustmentRequest(target); }
    if (target.id === 'audit-log-filter-form') {
        state.admin.auditLogFilterUserId = (target.elements.namedItem('userId') as HTMLSelectElement).value;
        state.admin.auditLogFilterStartDate = (target.elements.namedItem('startDate') as HTMLInputElement).value;
        state.admin.auditLogFilterEndDate = (target.elements.namedItem('endDate') as HTMLInputElement).value;
        render();
    }
}

function handleGlobalInput(e: Event) {
    const target = e.target as HTMLInputElement;

    // --- POS View Inputs ---
    if (target.id === 'pos-manual-search') {
        state.pos.manualSearchQuery = target.value;
        handleManualItemSearch();
        updatePOSItemSearchResultsDOM();
        return;
    }
    if (target.id === 'pos-student-search') {
        state.pos.studentSearchQuery = target.value;
        handleStudentSearch();
        updatePOSStudentSearchResultsDOM();
        return;
    }
    if (target.id === 'pos-manual-customer') {
        state.pos.manualCustomerName = target.value;
        if (state.pos.selectedStudent) {
            state.pos.selectedStudent = null;
        }
        updatePOSCustomerDisplay();
        return;
    }
    if (target.id === 'pos-discount') {
        state.pos.discount = parseFloat(target.value) || 0;
        updateCartSummaryDOM();
        return;
    }
    if (target.id === 'pos-tax') {
        state.pos.taxRate = parseFloat(target.value) || 0;
        updateCartSummaryDOM();
        return;
    }

    // --- Service Center / Printing Inputs ---
    if (target.closest('#photocopy-form')) {
        handlePhotocopyFormChange(target);
        return;
    }
    if (target.id === 'print-student-search') {
        state.printing.studentSearchQuery = target.value;
        handlePrintStudentSearch();
        render();
        return;
    }
}


function handleGlobalChange(e: Event) {
    const target = e.target as HTMLInputElement;
    // Handle changes for selects, radios, and checkboxes in the Service Center form
    if (target.closest('#photocopy-form')) {
        handlePhotocopyFormChange(target);
        return;
    }
     if(target.id === 'file-upload') {
        handleFileUpload(target.files!);
        return;
    }
     if (target.id === 'report-start-date') {
        state.finance.reportStartDate = target.value;
        return;
    }
     if (target.id === 'report-end-date') {
        state.finance.reportEndDate = target.value;
        return;
    }
}

// 7. --- EVENT HANDLER IMPLEMENTATIONS ---

// --- Auth Handlers ---
function handleLogin(form: HTMLFormElement) {
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const user = state.users.find(u => u.email === email && u.password === password);
    if (user) {
        const userRole = state.roles.find(r => r.id === user.roleId);
        state.auth.isLoggedIn = true;
        state.auth.user = { ...user, permissions: userRole?.permissions || [] };
        state.auth.loginError = null;
        state.currentView = 'app';
        logUserActivity('AUTH_LOGIN', `User '${user.name}' logged in.`);
        applyTheme();
    } else {
        state.auth.loginError = 'Invalid email or password.';
    }
    render();
}

function handleSignup(form: HTMLFormElement) {
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    if (state.users.some(u => u.email === email)) {
        state.auth.signupError = 'An account with this email already exists.';
        render();
        return;
    }

    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        roleId: 'cashier', // Default role
    };
    state.users.push(newUser);
    logUserActivity('AUTH_SIGNUP', `New user signed up: ${name} (ID: ${newUser.id}).`);
    // Automatically log in the new user
    const userRole = state.roles.find(r => r.id === newUser.roleId);
    state.auth.isLoggedIn = true;
    state.auth.user = { ...newUser, permissions: userRole?.permissions || [] };
    state.auth.signupError = null;
    state.currentView = 'app';
    applyTheme();
    render();
}

function handleLogout() {
    logUserActivity('AUTH_LOGOUT', `User '${state.auth.user!.name}' logged out.`);
    state.auth.isLoggedIn = false;
    state.auth.user = null;
    state.currentView = 'login';
    state.activeModule = 'dashboard';
    render();
}

// --- Inventory & Student Handlers ---
function handleInventorySubmit(form: HTMLFormElement) {
    const editingId = form.dataset.editingId;
    const isbn = (form.elements.namedItem('isbn') as HTMLInputElement).value;
    const name = (form.elements.namedItem('bookName') as HTMLInputElement).value;
    const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value);
    const stock = parseInt((form.elements.namedItem('stock') as HTMLInputElement).value, 10);
    
    if (editingId) {
        state.inventory[editingId] = { name, price, stock };
        logUserActivity('INVENTORY_UPDATE', `Updated book (ISBN: ${editingId}): ${name}.`);
    } else {
        if(state.inventory[isbn]) { alert('An item with this ISBN already exists.'); return; }
        state.inventory[isbn] = { name, price, stock };
        logUserActivity('INVENTORY_ADD', `Added new book (ISBN: ${isbn}): ${name}.`);
    }
    state.admin.editingInventoryId = null;
    render();
}

function handleDeleteInventory(isbn: string) {
    if (confirm(`Are you sure you want to delete this item (${state.inventory[isbn].name})?`)) {
        logUserActivity('INVENTORY_DELETE', `Deleted book (ISBN: ${isbn}): ${state.inventory[isbn].name}.`);
        delete state.inventory[isbn];
        render();
    }
}

function handleStudentSubmit(form: HTMLFormElement) {
    const editingId = form.dataset.editingId ? parseInt(form.dataset.editingId, 10) : null;
    const name = (form.elements.namedItem('studentName') as HTMLInputElement).value;
    const email = (form.elements.namedItem('studentEmail') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('studentPhone') as HTMLInputElement).value;
    const photo = (form.elements.namedItem('studentPhoto') as HTMLInputElement).value;

    if (editingId) {
        const student = state.students.find(s => s.id === editingId);
        if (student) {
            student.name = name;
            student.email = email;
            student.phone = phone;
            student.photo = photo;
            logUserActivity('STUDENT_UPDATE', `Updated student profile for ${name} (ID: ${editingId}).`);
        }
    } else {
        const studentArray = state.students;
        const newId = (studentArray.length > 0 ? studentArray[studentArray.length - 1].id : 100) + 1;
        state.students.push({ id: newId, name, email, phone, photo });
        logUserActivity('STUDENT_ADD', `Added new student: ${name} (ID: ${newId}).`);
    }
    state.admin.editingStudentId = null;
    render();
}

function handleDeleteStudent(studentId: number) {
    if (confirm(`Are you sure you want to delete this student? This action cannot be undone.`)) {
        const studentIndex = state.students.findIndex(s => s.id === studentId);
        if (studentIndex > -1) {
            const studentName = state.students[studentIndex].name;
            state.students.splice(studentIndex, 1);
            logUserActivity('STUDENT_DELETE', `Deleted student: ${studentName} (ID: ${studentId}).`);
            render();
        }
    }
}

// --- POS & Service Center Handlers ---
function handleAddItemToCart(isbn: string) {
    const book = state.inventory[isbn];
    if (!book || book.stock <= 0) {
        alert("Item is out of stock.");
        return;
    }
    const cartItem = state.pos.cart.find(i => i.isbn === isbn);
    if (cartItem) {
        if (cartItem.quantity < book.stock) {
            cartItem.quantity++;
        } else {
            alert(`Cannot add more. Only ${book.stock} in stock.`);
        }
    } else {
        state.pos.cart.push({ isbn, name: book.name, price: book.price, quantity: 1 });
    }
    
    state.pos.manualSearchQuery = '';
    state.pos.manualSearchResults = [];
    
    const searchInput = document.getElementById('pos-manual-search') as HTMLInputElement;
    const searchResults = document.getElementById('pos-manual-search-results');
    if(searchInput) searchInput.value = '';
    if(searchResults) searchResults.innerHTML = '';

    updateCartDOM();
}

function handleUpdateCartQuantity(isbn: string, change: number) {
    const item = state.pos.cart.find(i => i.isbn === isbn);
    if (item) {
        const inventoryItem = state.inventory[isbn];
        const newQuantity = item.quantity + change;

        if (newQuantity > 0 && newQuantity <= inventoryItem.stock) {
            item.quantity = newQuantity;
        } else if (newQuantity <= 0) {
            state.pos.cart = state.pos.cart.filter(i => i.isbn !== isbn);
        } else {
            alert(`Cannot add more. Only ${inventoryItem.stock} in stock.`);
        }
        updateCartDOM();
    }
}

function handleRemoveFromCart(isbn: string) {
    state.pos.cart = state.pos.cart.filter(i => i.isbn !== isbn);
    updateCartDOM();
}

function handleManualItemSearch() {
    const query = state.pos.manualSearchQuery.toLowerCase();
    if (query.length < 2) {
        state.pos.manualSearchResults = [];
        return;
    }
    state.pos.manualSearchResults = Object.entries(state.inventory)
        .filter(([isbn, item]) => item.name.toLowerCase().includes(query) || isbn.includes(query))
        .map(([isbn, item]) => ({ isbn, ...item }));
}

function handleStudentSearch() {
    const query = state.pos.studentSearchQuery.toLowerCase();
    if (query.length < 2) {
        state.pos.studentSearchResults = [];
        return;
    }
    state.pos.studentSearchResults = state.students
        .filter(s => s.name.toLowerCase().includes(query) || String(s.id).includes(query));
}

function handleSelectPosStudent(student: { id: number; name: string }) {
    state.pos.selectedStudent = student;
    state.pos.manualCustomerName = ''; 
    state.pos.studentSearchQuery = '';
    state.pos.studentSearchResults = [];
    render();
}


function handleCheckout() {
    const totals = calculateCartTotals();
    const invoice = {
        id: `INV-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'pos',
        items: [...state.pos.cart],
        ...totals,
        studentName: state.pos.selectedStudent?.name || state.pos.manualCustomerName || 'Walk-in Customer',
        userId: state.auth.user!.id,
        userName: state.auth.user!.name,
    };
    state.pos.currentInvoice = invoice;
    render();
}

function handlePhotocopyCheckout() {
    const totals = calculatePhotocopyTotals();
    const invoice = {
        id: `INV-SC-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'photocopy',
        details: { ...state.photocopy, breakdown: totals.breakdown },
        total: totals.total,
        studentName: state.photocopy.manualCustomerName || 'Walk-in Customer',
        userId: state.auth.user!.id,
        userName: state.auth.user!.name,
    };
    state.photocopy.currentInvoice = invoice;
    render();
}

function handleConfirmAndPrintInvoice(type: string) {
    let invoice;
    if (type === 'pos') {
        invoice = state.pos.currentInvoice;
        if (!invoice) return;
        invoice.isFinalized = true;
        
        // Decrease stock
        invoice.items.forEach((item: any) => {
            state.inventory[item.isbn].stock -= item.quantity;
        });

        state.pos.completedSales.push(invoice);
        logUserActivity('POS_SALE_COMPLETED', `Completed POS sale #${invoice.id}, Total: Rs ${invoice.total.toFixed(2)}.`);
        
        printReceipt(renderThermalReceiptHTML(invoice, state.settings));
    } else { // photocopy
        invoice = state.photocopy.currentInvoice;
        if (!invoice) return;
        invoice.isFinalized = true;
        state.pos.completedSales.push(invoice);
        logUserActivity('SERVICE_SALE_COMPLETED', `Completed Service Center sale #${invoice.id}, Total: Rs ${invoice.total.toFixed(2)}.`);
        printReceipt(renderPhotocopyThermalReceiptHTML(invoice, state.settings));
    }
    
    render();
}

function handleCancelSale(type: string) {
    if (type === 'pos') {
        state.pos.currentInvoice = null;
        state.pos.cart = [];
        state.pos.discount = 0;
        state.pos.taxRate = state.settings.posSettings.defaultTaxRate;
        state.pos.manualCustomerName = '';
        state.pos.selectedStudent = null;
    } else { // photocopy
        state.photocopy.currentInvoice = null;
    }
    render();
}

function handleCancelCurrentSale() {
    if(confirm('Are you sure you want to cancel the current sale and clear the cart?')) {
        state.pos.cart = [];
        state.pos.discount = 0;
        state.pos.taxRate = state.settings.posSettings.defaultTaxRate;
        state.pos.manualCustomerName = '';
        state.pos.selectedStudent = null;
        render();
    }
}

function handleStartNewSale(type: string) {
    if (type === 'pos') {
        state.pos.currentInvoice = null;
        state.pos.cart = [];
        state.pos.discount = 0;
        state.pos.taxRate = state.settings.posSettings.defaultTaxRate;
        state.pos.manualCustomerName = '';
        state.pos.selectedStudent = null;
    } else { // photocopy
        state.photocopy.currentInvoice = null;
        Object.assign(state.photocopy, {
            bwPages: 0, colorPages: 0, copies: 1, scanPages: 1, idCardCount: 1, manualCustomerName: ''
        });
    }
    render();
}

function handleReprintInvoice(type: string) {
    const invoice = type === 'pos' ? state.pos.currentInvoice : state.photocopy.currentInvoice;
    if (invoice) {
        const receiptHTML = type === 'pos' ? renderThermalReceiptHTML(invoice, state.settings) : renderPhotocopyThermalReceiptHTML(invoice, state.settings);
        printReceipt(receiptHTML);
    }
}


function startBarcodeScanner() {
    alert("Barcode scanning not implemented in this demo.");
}
function stopBarcodeScanner() {
    alert("Barcode scanning stopped.");
}

function handlePhotocopyFormChange(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
    const field = target.dataset.photocopyField as keyof typeof state.photocopy;
    if (!field) return;

    let value: string | number | boolean;
    if (target.type === 'checkbox') {
        value = (target as HTMLInputElement).checked;
    } else if (target.type === 'text' && target.inputMode === 'numeric') {
        value = parseFloat(target.value) || 0;
    } else {
        value = target.value;
    }

    (state.photocopy as any)[field] = value;
    
    // If the service type changed, we need to re-render the form options.
    if (field === 'serviceType') {
        render(); 
    } else {
        // For all other changes (typing in numbers, etc.), just update the summary.
        updatePhotocopySummaryDOM();
    }
}

// --- Day Closure and History Handlers ---
function handleShowClosureModal() {
    const currentUser = state.auth.user!;
    const salesForUser = state.pos.completedSales.filter(s => s.userId === currentUser.id && !s.closureId);
    const refundsForUser = state.pos.refunds.filter(r => r.userId === currentUser.id && !r.closureId);

    const totalSales = salesForUser.reduce((sum, s) => sum + s.total, 0);
    const totalRefunds = refundsForUser.reduce((sum, r) => sum + r.amount, 0);

    state.pos.closurePreview = {
        totalSales,
        salesCount: salesForUser.length,
        totalRefunds,
        refundsCount: refundsForUser.length
    };
    state.pos.showClosureModal = true;
    render();
}

function handleCloseDaySale() {
    const currentUser = state.auth.user!;
    const salesForClosure = state.pos.completedSales.filter(s => s.userId === currentUser.id && !s.closureId);
    const refundsForClosure = state.pos.refunds.filter(r => r.userId === currentUser.id && !r.closureId);

    if (salesForClosure.length === 0 && refundsForClosure.length === 0) {
        alert("No new transactions to close.");
        state.pos.showClosureModal = false;
        render();
        return;
    }

    const closureId = `CL-${currentUser.id}-${Date.now()}`;
    const newClosure = {
        id: closureId,
        date: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        totalSales: salesForClosure.reduce((sum, s) => sum + s.total, 0),
        salesCount: salesForClosure.length,
        totalRefunds: refundsForClosure.reduce((sum, r) => sum + r.amount, 0),
        refundsCount: refundsForClosure.length,
        salesInvoices: salesForClosure,
        refundInvoices: refundsForClosure,
        status: 'Pending' as 'Pending' | 'Received'
    };

    state.finance.dailyClosures.push(newClosure);
    salesForClosure.forEach(s => s.closureId = closureId);
    refundsForClosure.forEach(r => r.closureId = closureId);

    logUserActivity('POS_DAY_CLOSE', `User closed day's sale, ID: ${closureId}.`);
    state.pos.showClosureModal = false;
    state.pos.closurePreview = null;
    
    printReceipt(renderDayClosureReceiptHTML(newClosure), 'width=800,height=600');
    render();
}

function handleFilterSalesHistory() {
    state.pos.historyStartDate = (document.getElementById('pos-history-start-date') as HTMLInputElement).value;
    state.pos.historyEndDate = (document.getElementById('pos-history-end-date') as HTMLInputElement).value;
    render();
}

// --- Admin Handlers ---

function handleUserSubmit(form: HTMLFormElement) {
    const editingId = form.dataset.editingId ? parseInt(form.dataset.editingId, 10) : null;
    const name = (form.elements.namedItem('userName') as HTMLInputElement).value;
    const email = (form.elements.namedItem('userEmail') as HTMLInputElement).value;
    const password = (form.elements.namedItem('userPassword') as HTMLInputElement).value;
    const roleId = (form.elements.namedItem('userRole') as HTMLSelectElement).value;

    if (editingId) {
        const user = state.users.find(u => u.id === editingId);
        if (user) {
            user.name = name;
            user.email = email;
            user.roleId = roleId;
            if (password) user.password = password;
            logUserActivity('ADMIN_USER_UPDATE', `Updated user ${name} (ID: ${editingId}).`);
        }
    } else {
        const userArray = state.users;
        const newId = (userArray.length > 0 ? userArray[userArray.length - 1].id : 0) + 1;
        state.users.push({ id: newId, name, email, password, roleId });
        logUserActivity('ADMIN_USER_ADD', `Added user ${name} (ID: ${newId}).`);
    }
    state.admin.editingUserId = null;
    render();
}

function handleDeleteUser(userId: number) {
    if (userId === state.auth.user?.id) {
        alert("You cannot delete your own account.");
        return;
    }
    if (confirm("Are you sure you want to delete this user?")) {
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            const userName = state.users[userIndex].name;
            state.users.splice(userIndex, 1);
            logUserActivity('ADMIN_USER_DELETE', `Deleted user ${userName} (ID: ${userId}).`);
            render();
        }
    }
}

function handleRoleSubmit(form: HTMLFormElement) {
    const editingId = form.dataset.editingId;
    const name = (form.elements.namedItem('roleName') as HTMLInputElement).value;
    const permissions = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="permissions"]:checked')).map(el => el.value);

    if (editingId) {
        const role = state.roles.find(r => r.id === editingId);
        if (role) {
            role.name = name;
            role.permissions = permissions;
            logUserActivity('ADMIN_ROLE_UPDATE', `Updated role ${name}.`);
        }
    } else {
        const newId = name.toLowerCase().replace(/\s+/g, '_');
        if (state.roles.some(r => r.id === newId)) {
            alert("A role with this name already exists.");
            return;
        }
        state.roles.push({ id: newId, name, permissions });
        logUserActivity('ADMIN_ROLE_ADD', `Added role ${name}.`);
    }
    state.admin.editingRoleId = null;
    render();
}

function handleDeleteRole(roleId: string) {
    if (['admin'].includes(roleId)) {
        alert("Cannot delete the core Admin role.");
        return;
    }
    if (confirm("Are you sure you want to delete this role? Users with this role will lose their permissions.")) {
        const roleIndex = state.roles.findIndex(r => r.id === roleId);
        if (roleIndex > -1) {
            const roleName = state.roles[roleIndex].name;
            // Un-assign role from users
            state.users.forEach(u => { if (u.roleId === roleId) u.roleId = ''; });
            state.roles.splice(roleIndex, 1);
            logUserActivity('ADMIN_ROLE_DELETE', `Deleted role ${roleName}.`);
            render();
        }
    }
}

// --- Printing Handlers ---
function resetPrintingState() {
    Object.assign(state.printing, {
        step: 'details',
        orderDetails: null,
        selectedPaymentMethod: null,
        studentSearchQuery: '',
        studentSearchResults: [],
        selectedStudentId: null,
    });
}

async function handleFileUpload(files: FileList) {
    const fileListContainer = document.getElementById('file-list-container')!;
    fileListContainer.innerHTML = `<div class="loader"></div> <span>Analyzing files...</span>`;

    const filePromises = Array.from(files).map(file => {
        return new Promise<{ name: string; size: number; summary: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                const summary = await getSummaryFromContent(content);
                resolve({ name: file.name, size: file.size, summary });
            };
            reader.onerror = reject;
            // Read as text to pass to Gemini, suitable for docx, pdf (as binary text), etc.
            reader.readAsText(file);
        });
    });

    try {
        const fileDetails = await Promise.all(filePromises);
        const fileListHTML = `<ul>${fileDetails.map(f => `<li><strong>${f.name}</strong> - <em>${f.summary}</em></li>`).join('')}</ul>`;
        fileListContainer.innerHTML = fileListHTML;
    } catch (error) {
        fileListContainer.innerHTML = `<p class="error-message">Error analyzing files. Please try again.</p>`;
        console.error("Error during file processing:", error);
    }
}

function handlePrintStudentSearch() {
    const query = state.printing.studentSearchQuery.toLowerCase();
    if (query.length < 2) {
        state.printing.studentSearchResults = [];
        return;
    }
    state.printing.studentSearchResults = state.students
        .filter(s => s.name.toLowerCase().includes(query) || String(s.id).includes(query));
}

function handleSelectPrintStudent(student: any) {
    state.printing.selectedStudentId = student.id;
    state.printing.studentSearchQuery = '';
    state.printing.studentSearchResults = [];
    render();
}

function handlePrintOrderSubmit(form: HTMLFormElement) {
    const { printSettings } = state.settings;
    let studentInfo;

    if (state.printing.selectedStudentId) {
        studentInfo = state.students.find(s => s.id === state.printing.selectedStudentId);
    } else {
        studentInfo = {
            id: 'walk-in',
            name: (document.getElementById('walkin-name') as HTMLInputElement).value,
            email: (document.getElementById('walkin-email') as HTMLInputElement).value,
            phone: (document.getElementById('walkin-phone') as HTMLInputElement).value,
        };
    }
    if (!studentInfo) {
        alert("Student information is missing.");
        return;
    }

    const pageCount = parseInt((document.getElementById('page-count') as HTMLInputElement).value, 10);
    const copies = parseInt((document.getElementById('copies') as HTMLInputElement).value, 10);
    const colorMode = (document.getElementById('color-mode') as HTMLSelectElement).value;
    const paperType = (document.getElementById('paper-type') as HTMLSelectElement).value;
    const binding = (document.getElementById('binding') as HTMLSelectElement).value;
    const paperSize = (document.getElementById('paper-size') as HTMLSelectElement).value;

    const pricePerPage = colorMode === 'color' ? printSettings.perPage.color : printSettings.perPage.bw;
    const paperTypeInfo = printSettings.paperTypes.find(t => t.id === paperType)!;
    const bindingInfo = printSettings.bindingTypes.find(b => b.id === binding)!;
    
    const printCost = pageCount * pricePerPage * copies;
    const paperSurcharge = pageCount * paperTypeInfo.extraCost * copies;
    const bindingCost = bindingInfo.cost * copies;
    const total = printCost + paperSurcharge + bindingCost;

    const fileListContainer = document.getElementById('file-list-container')!;
    const summary = Array.from(fileListContainer.querySelectorAll('li')).map(li => li.textContent).join('; ');

    state.printing.orderDetails = {
        id: `PO-${Date.now()}`,
        student: studentInfo,
        files: [], // In a real app, you'd handle file objects here
        summary,
        printDetails: { pageCount, copies, colorMode, paperSize, paperType, binding },
        priceDetails: { printCost, paperSurcharge, bindingCost, total, pageCount, copies },
        payment: { method: null, status: 'Pending' },
        status: 'Pending',
    };
    state.printing.step = 'payment';
    render();
}

function handleConfirmPrintOrder() {
    if (!state.printing.orderDetails || !state.printing.selectedPaymentMethod) {
        alert("Please select a payment method.");
        return;
    }
    const order = state.printing.orderDetails;
    order.payment.method = state.paymentGateways.find(p => p.id === state.printing.selectedPaymentMethod)!.name;
    order.payment.status = 'Paid'; // Assuming payment is confirmed on this step
    
    state.printOrders.push(order);
    logUserActivity('PRINT_ORDER_CREATE', `Created new print order #${order.id} for ${order.student.name}.`);

    state.printing.step = 'confirmation';
    render();
}

function handleUpdateOrderStatus(orderId: string) {
    const newStatus = (document.getElementById(`status-update-${orderId}`) as HTMLSelectElement).value;
    const order = state.printOrders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        logUserActivity('PRINT_ORDER_STATUS_UPDATE', `Updated status for order #${orderId} to ${newStatus}.`);
        render();
    }
}


// --- Finance & Reporting Handlers ---

function handleViewClosure(closureId: string) {
    state.finance.viewingClosure = state.finance.dailyClosures.find(c => c.id === closureId) || null;
    render();
}

function handleReceiveClosure(closureId: string) {
    const closure = state.finance.dailyClosures.find(c => c.id === closureId);
    if (closure && closure.status === 'Pending') {
        closure.status = 'Received';
        logUserActivity('FINANCE_CLOSURE_RECEIVE', `Finance received closure #${closureId}.`);
        state.finance.viewingClosure = null; // Close modal
        render();
    }
}

function handleExpenseSubmit(form: HTMLFormElement) {
    const editingId = state.finance.editingExpenseId;
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const category = (form.elements.namedItem('category') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLInputElement).value;
    const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
    const user = state.auth.user!;

    if (editingId) {
        const expense = state.finance.expenses.find(e => e.id === editingId);
        if (expense) {
            expense.date = date;
            expense.category = category;
            expense.description = description;
            expense.amount = amount;
            logUserActivity('FINANCE_EXPENSE_UPDATE', `Updated expense #${editingId}: ${description}.`);
        }
    } else {
        const newExpense = {
            id: `exp${Date.now()}`,
            date, category, description, amount,
            userId: user.id,
            userName: user.name
        };
        state.finance.expenses.push(newExpense);
        logUserActivity('FINANCE_EXPENSE_ADD', `Added expense: ${description}, Amount: Rs ${amount}.`);
    }

    state.finance.editingExpenseId = null;
    render();
}

function handleEditExpenseClick(expenseId: string) {
    state.finance.editingExpenseId = expenseId;
    render();
}

function handleDeleteExpense(expenseId: string) {
    if (confirm("Are you sure you want to delete this expense record?")) {
        const expenseIndex = state.finance.expenses.findIndex(e => e.id === expenseId);
        if (expenseIndex > -1) {
            logUserActivity('FINANCE_EXPENSE_DELETE', `Deleted expense #${expenseId}: ${state.finance.expenses[expenseIndex].description}.`);
            state.finance.expenses.splice(expenseIndex, 1);
            render();
        }
    }
}

// --- Settings Handlers ---
function handleSavePOSSettings(form: HTMLFormElement) {
    state.settings.posSettings.lowStockThreshold = parseInt((document.getElementById('low-stock-threshold') as HTMLInputElement).value, 10);
    state.settings.posSettings.defaultTaxRate = parseFloat((document.getElementById('default-tax-rate') as HTMLInputElement).value);
    state.settings.posSettings.allowBarcodeScanning = (document.getElementById('allow-barcode-scanning') as HTMLInputElement).checked;
    state.settings.posSettings.allowManualSearch = (document.getElementById('allow-manual-search') as HTMLInputElement).checked;
    state.settings.posSettings.allowCustomerSelection = (document.getElementById('allow-customer-selection') as HTMLInputElement).checked;
    logUserActivity('SETTINGS_UPDATE_POS', 'Updated Point of Sale settings.');
    alert("POS settings saved!");
    render();
}

function handleSavePhotocopySettings(form: HTMLFormElement) {
    const paperSizes: any[] = [];
    document.querySelectorAll('#photocopy-paper-sizes-container .dynamic-row').forEach(row => {
        paperSizes.push({
            id: `size-${Date.now()}-${Math.random()}`,
            name: (row.querySelector('[name="paper_size_name"]') as HTMLInputElement).value,
            bwPrice: parseFloat((row.querySelector('[name="paper_size_bw"]') as HTMLInputElement).value),
            colorPrice: parseFloat((row.querySelector('[name="paper_size_color"]') as HTMLInputElement).value),
        });
    });

    const paperTypes: any[] = [];
    document.querySelectorAll('#photocopy-paper-types-container .dynamic-row').forEach(row => {
        paperTypes.push({
            id: `type-${Date.now()}-${Math.random()}`,
            name: (row.querySelector('[name="paper_type_name"]') as HTMLInputElement).value,
            extraCost: parseFloat((row.querySelector('[name="paper_type_cost"]') as HTMLInputElement).value),
        });
    });

    state.settings.photocopySettings.paperSizes = paperSizes;
    state.settings.photocopySettings.paperTypes = paperTypes;
    state.settings.photocopySettings.serviceCosts = {
        scanPerPage: parseFloat((document.getElementById('cost-scan') as HTMLInputElement).value),
        idCard: parseFloat((document.getElementById('cost-id-card') as HTMLInputElement).value),
        laminationPerPage: parseFloat((document.getElementById('cost-lamination') as HTMLInputElement).value),
        staplePerSet: parseFloat((document.getElementById('cost-staple') as HTMLInputElement).value),
        urgentFee: parseFloat((document.getElementById('cost-urgent') as HTMLInputElement).value),
    };

    logUserActivity('SETTINGS_UPDATE_SERVICE_CENTER', 'Updated Service Center settings.');
    alert("Service Center settings saved!");
    render();
}


function handleSaveAppSettings(form: HTMLFormElement) {
    state.settings.shopName = (document.getElementById('shop-name') as HTMLInputElement).value;
    state.settings.theme.primaryColor = (document.getElementById('primary-color') as HTMLInputElement).value;
    document.querySelectorAll<HTMLInputElement>('input[name="module-toggle"]').forEach(toggle => {
        const key = toggle.dataset.moduleKey as keyof typeof state.settings.modules;
        if (key) {
            state.settings.modules[key].enabled = toggle.checked;
        }
    });
    logUserActivity('SETTINGS_UPDATE_APP', 'Updated general application settings.');
    alert("Application settings saved!");
    applyTheme();
    render();
}

function handleSaveInvoiceSettings(form: HTMLFormElement) {
    state.settings.invoiceSettings.logoUrl = (document.getElementById('invoice-logo-url') as HTMLInputElement).value;
    state.settings.invoiceSettings.footerText = (document.getElementById('invoice-footer-text') as HTMLInputElement).value;
    state.settings.invoiceSettings.showShopName = (document.getElementById('show-shop-name') as HTMLInputElement).checked;
    state.settings.invoiceSettings.showInvoiceId = (document.getElementById('show-invoice-id') as HTMLInputElement).checked;
    state.settings.invoiceSettings.showDate = (document.getElementById('show-date') as HTMLInputElement).checked;
    state.settings.invoiceSettings.showBilledTo = (document.getElementById('show-billed-to') as HTMLInputElement).checked;
    logUserActivity('SETTINGS_UPDATE_INVOICE', 'Updated invoice settings.');
    alert("Invoice settings saved!");
    render();
}

function handleSavePrintSettings(form: HTMLFormElement) {
    state.settings.printSettings.perPage.bw = parseFloat((document.getElementById('price-per-page-bw') as HTMLInputElement).value);
    state.settings.printSettings.perPage.color = parseFloat((document.getElementById('price-per-page-color') as HTMLInputElement).value);

    const paperTypes: any[] = [];
     document.querySelectorAll('#paper-types-container .dynamic-row').forEach((row, index) => {
        paperTypes.push({
            id: `paper-${index}`,
            name: (row.children[0] as HTMLInputElement).value,
            extraCost: parseFloat((row.children[1] as HTMLInputElement).value),
        });
    });
    state.settings.printSettings.paperTypes = paperTypes;
    
    const bindingTypes: any[] = [];
    document.querySelectorAll('#binding-types-container .dynamic-row').forEach((row, index) => {
        bindingTypes.push({
            id: `binding-${index}`,
            name: (row.children[0] as HTMLInputElement).value,
            cost: parseFloat((row.children[1] as HTMLInputElement).value),
        });
    });
    state.settings.printSettings.bindingTypes = bindingTypes;

    logUserActivity('SETTINGS_UPDATE_PRINTING', 'Updated printing service settings.');
    alert("Print settings saved!");
    render();
}

function handleSavePaymentGateways(form: HTMLFormElement) {
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-gateway-id]').forEach(input => {
        const gatewayId = input.dataset.gatewayId!;
        const field = input.dataset.field as keyof typeof state.paymentGateways[0];
        const gateway = state.paymentGateways.find(g => g.id === gatewayId);
        if (gateway) {
            if (input.type === 'checkbox') {
                (gateway as any)[field] = (input as HTMLInputElement).checked;
            } else {
                (gateway as any)[field] = input.value;
            }
        }
    });
    logUserActivity('SETTINGS_UPDATE_PAYMENT', 'Updated payment gateway settings.');
    alert("Payment gateway settings saved!");
    render();
}

// --- Placeholders for unimplemented features ---
function handleRequestAdjustment(saleId: string, type: 'return' | 'cancel' | 'adjustDiscount') {
    const sale = state.pos.completedSales.find(s => s.id === saleId);
    if(sale) {
        state.pos.adjustmentModalData = { sale, type };
        render();
    }
}

function handleSubmitAdjustmentRequest(form: HTMLFormElement) {
    alert("Adjustment request submitted for admin approval.");
    logUserActivity('ADJUSTMENT_REQUEST', `Submitted adjustment request for invoice #${form.dataset.saleId}.`);
    state.pos.adjustmentModalData = null;
    render();
}

function handleApproveRequest(requestId: string) {
    alert("Request approved.");
    const req = state.returns.find(r => r.id === requestId);
    if(req) {
        req.status = 'Approved';
        req.approvedBy = { name: state.auth.user!.name };
        logUserActivity('ADJUSTMENT_APPROVE', `Approved adjustment request #${requestId}.`);
        render();
    }
}

function handleRejectRequest(requestId: string) {
    alert("Request rejected.");
    const req = state.returns.find(r => r.id === requestId);
    if(req) {
        req.status = 'Rejected';
        req.rejectedBy = { name: state.auth.user!.name };
        logUserActivity('ADJUSTMENT_REJECT', `Rejected adjustment request #${requestId}.`);
        render();
    }
}

function handleExportFinanceReportPDF() { alert("PDF export for finance report is not implemented."); }
function handleExportFinanceReportCSV() { alert("CSV export for finance report is not implemented."); }
function handleExportClosuresPDF() { alert("PDF export for closures is not implemented."); }
function handleExportClosuresCSV() { alert("CSV export for closures is not implemented."); }
function handleExportExpensesPDF() { alert("PDF export for expenses is not implemented."); }
function handleExportExpensesCSV() { alert("CSV export for expenses is not implemented."); }
function handleExportHistoryPDF() { alert("PDF export for sales history is not implemented."); }
function handleExportHistoryCSV() { alert("CSV export for sales history is not implemented."); }

// Initialize the application
init();