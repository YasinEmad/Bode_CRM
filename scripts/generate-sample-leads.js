#!/usr/bin/env node

/**
 * Sample Excel file generator for testing bulk import feature
 * Run with: node scripts/generate-sample-leads.js
 */

const XLSX = require('xlsx');
const path = require('path');

const sampleLeads = [
  {
    name: 'Alice Johnson',
    email: 'alice.johnson@email.com',
    phone: '555-0101',
    property: 'Downtown Apartment Complex',
    value: 250000,
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    phone: '555-0102',
    property: 'Beach House - Waterfront',
    value: 450000,
  },
  {
    name: 'Carol Davis',
    email: 'carol.davis@email.com',
    phone: '555-0103',
    property: 'Commercial Building - Downtown',
    value: 800000,
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@email.com',
    phone: '555-0104',
    property: 'Residential Lot - Suburb',
    value: 150000,
  },
  {
    name: 'Emma Martinez',
    email: 'emma.martinez@email.com',
    phone: '555-0105',
    property: 'Office Space - Business District',
    value: 600000,
  },
  {
    name: 'Frank Brown',
    email: 'frank.brown@email.com',
    phone: '555-0106',
    property: 'Historic Building - Renovated',
    value: 350000,
  },
  {
    name: 'Grace Lee',
    email: 'grace.lee@email.com',
    phone: '555-0107',
    property: 'Farm Land - Rural Area',
    value: 200000,
  },
  {
    name: 'Henry Taylor',
    email: 'henry.taylor@email.com',
    phone: '555-0108',
    property: 'Retail Space - Mall Location',
    value: 500000,
  },
  {
    name: 'Iris Anderson',
    email: 'iris.anderson@email.com',
    phone: '555-0109',
    property: 'Condo Unit - Downtown High-Rise',
    value: 320000,
  },
  {
    name: 'Jack Robinson',
    email: 'jack.robinson@email.com',
    phone: '555-0110',
    property: 'Restaurant Space - Prime Location',
    value: 400000,
  },
];

// Create workbook and worksheet
const worksheet = XLSX.utils.json_to_sheet(sampleLeads);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

// Adjust column widths
worksheet['!cols'] = [
  { wch: 20 }, // name
  { wch: 25 }, // email
  { wch: 15 }, // phone
  { wch: 35 }, // property
  { wch: 12 }, // value
];

// Write file
const filename = path.join(__dirname, '../sample-leads.xlsx');
XLSX.writeFile(workbook, filename);

console.log(`✓ Sample leads file generated: ${filename}`);
console.log(`✓ Contains ${sampleLeads.length} sample leads`);
console.log('\nYou can now upload this file to the admin panel to test bulk import.');
