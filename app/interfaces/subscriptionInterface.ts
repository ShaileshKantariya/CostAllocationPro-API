export interface IZohoSubscription {
    subscription_id: string;
    product_id: string;
    plan: any;
    created_time: string;
    status: string;
    addons: any[];
    expires_at: string;
    customer: {
        first_name: string;
        last_name: string;
        customer_id: string;
        email: string;
    }
}

export interface ICancelZohoSubscription {
    cancelled_at: string;
    subscription_id: string;
    product_id: string;
    plan: any;
    created_time: string;
    status: string;
    addons: any[];
    expires_at: string;
    customer: {
        first_name: string;
        last_name: string;
        customer_id: string;
        email: string;
    }
}

export interface ISubscriptionQuery {
    userId: string;
    companyId?: string;
}