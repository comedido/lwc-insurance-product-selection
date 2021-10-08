// Custom LWC
import { LightningElement, track, api } from 'lwc';

import { OmniscriptBaseMixin } from 'vlocity_ins/omniscriptBaseMixin';

import { dataFormatter, omniscriptUtils } from 'vlocity_ins/insUtility';

export default class CustomProductSelection extends OmniscriptBaseMixin(LightningElement) {

    @api clearStateOnChange;

    @track isLoaded = false;
    @track products;
    @track selectedProduct;
    @track visibleProducts = [];

    isStateCleared = false;
    pageSize = /Mobi/.test(navigator.userAgent) ? 1 : 3;
    visibleProductsIndex = 0; // tracks the location of the products displayed in the current page

    connectedCallback() {
        const dataOmniLayout = this.getAttribute('data-omni-layout');
        this.theme = dataOmniLayout === 'newport' ? 'nds' : 'slds';
        this.stateData = omniscriptUtils.getSaveState(this);
        if (this.stateData) {
            this.parseSavedState(this.stateData);
        } else {
            this.getProducts();
        }
    }

    /**
     * Retrieves product data if it wasn't already provided
     */
    getProducts() {
        const initAction = this.omniJsonDef.propSetMap.initAction || {};
        const dataMapValue = omniscriptUtils.formatQuery(this.omniGetMergeField.bind(this), initAction, 'InsProductService', 'getRatedProducts');
        omniscriptUtils.omniGenericInvoke(this, dataMapValue)
        .then(response => {
            this.formatProducts(JSON.parse(response).records);
        }, error => {
            console.error(error);
            this.isLoaded = true;
        });
    }

    /**
     * Formats product data
     * @param {Object} products
     */
    formatProducts(products) {
        this.unformattedProductsStr = JSON.stringify(products);
        this.products = products.map(product => dataFormatter.formatProduct(product, { isProductSelection: true }));
        this.setVisibleProducts();
        this.isLoaded = true;
    }

    /**
     * Set UI to previous saved state
     * @param {Object} stateData
     */
    parseSavedState(stateData) {
        this.unformattedProductsStr = stateData.unformattedProductsStr;
        this.products = stateData.products;
        this.selectedProduct = this.products.find(product => product.Id === stateData.selectedProductId);
        this.visibleProductsIndex = stateData.visibleProductsIndex;
        this.setVisibleProducts();
        this.isLoaded = true;
    }

    setVisibleProducts() {
        this.visibleProducts = [];
        for (let i = 0; i < this.pageSize; i++) {
            const visIndex = this.visibleProductsIndex + i;
            if (this.products[visIndex]) {
                this.visibleProducts.push(this.products[visIndex]);
            }
        }
        this.updateOmniscriptData();
    }

    paginateBack() {
        this.visibleProductsIndex -= this.pageSize;
        this.setVisibleProducts();
    }

    paginateForward() {
        this.visibleProductsIndex += this.pageSize;
        this.setVisibleProducts();
    }

    selectProduct(e) {
        omniscriptUtils.clearStateOnChange(this);
        const clickedProductId = e.currentTarget.dataset.productId;
        let productSelected = true;
        if (this.selectedProduct) {
            this.selectedProduct.isSelected = false;
            if (this.selectedProduct.Id === clickedProductId) {
                // Unselect product
                this.selectedProduct = null;
                productSelected = false;
            }
        }
        if (productSelected) {
            this.selectedProduct = this.products.find(product => product.Id === clickedProductId);
            this.selectedProduct.isSelected = true;
        }
        this.updateOmniscriptData();
        // Evaluate if user can move to next step
        this.omniValidate();
    }

    updateOmniscriptData() {
        let selectedProduct = null;
        if (this.selectedProduct) {
            const product = JSON.parse(this.unformattedProductsStr).find(product => product.Id === this.selectedProduct.Id);
            // Apex methods and OS expect data in this format
            selectedProduct = {
                records: [product]
            };
        }
        omniscriptUtils.updateDataJson(this, selectedProduct);
    }

    // Overwrites method from OmniscriptBaseMixin to prevent user from using Next button
    @api
    checkValidity() {
        return this.selectedProduct != null;
    }

    get paginateBackDisabled() {
        return this.visibleProductsIndex === 0;
    }

    get paginateForwardDisabled() {
        return this.visibleProductsIndex >= this.products.length - this.pageSize;
    }

    get dataError() {
        return this.isLoaded && !this.products;
    }

    get displayError() {
        return this.dataError || this.showValidation;
    }

    disconnectedCallback(){
        const stateData = {
            products: this.products,
            unformattedProductsStr: this.unformattedProductsStr,
            selectedProductId: this.selectedProduct ? this.selectedProduct.Id : null,
            visibleProductsIndex: this.visibleProductsIndex
        };
        this.omniSaveState(stateData, null, true);
    }

}