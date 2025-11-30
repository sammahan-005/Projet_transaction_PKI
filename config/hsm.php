<?php

return [
    /*
    |--------------------------------------------------------------------------
    | HSM Backend
    |--------------------------------------------------------------------------
    |
    | Choose the backend for storing CA private keys:
    | - 'file': Encrypted file storage (default, less secure)
    | - 'hsm': Hardware Security Module (PKCS#11)
    | - 'aws_cloudhsm': AWS CloudHSM
    | - 'azure_keyvault': Azure Key Vault
    |
    */
    'backend' => env('HSM_BACKEND', 'file'),

    /*
    |--------------------------------------------------------------------------
    | HSM Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for HSM backends
    |
    */
    'hsm' => [
        'library_path' => env('HSM_LIBRARY_PATH', '/usr/lib/pkcs11/libsofthsm2.so'),
        'slot' => env('HSM_SLOT', 0),
        'pin' => env('HSM_PIN', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | AWS CloudHSM Configuration
    |--------------------------------------------------------------------------
    */
    'aws_cloudhsm' => [
        'cluster_id' => env('AWS_CLOUDHSM_CLUSTER_ID'),
        'region' => env('AWS_CLOUDHSM_REGION', 'us-east-1'),
        'credentials' => [
            'key' => env('AWS_CLOUDHSM_ACCESS_KEY'),
            'secret' => env('AWS_CLOUDHSM_SECRET_KEY'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Azure Key Vault Configuration
    |--------------------------------------------------------------------------
    */
    'azure_keyvault' => [
        'vault_url' => env('AZURE_KEYVAULT_URL'),
        'tenant_id' => env('AZURE_TENANT_ID'),
        'client_id' => env('AZURE_CLIENT_ID'),
        'client_secret' => env('AZURE_CLIENT_SECRET'),
    ],
];

