/**
 Generated from HarperDB schema
 Manual changes will be lost!
 > harper dev .
 */
export interface Agent {
	id: string;
	name?: string;
	brokerage?: string;
	email?: string;
	phone?: string;
	listings?: Listing[];
}

export type NewAgent = Omit<Agent, 'id'>;
export type { Agent as AgentRecord };
export type AgentRecords = Agent[];
export type NewAgentRecord = Omit<Agent, 'id'>;

export interface Listing {
	id: string;
	mlsId?: string;
	status?: string;
	listPrice?: number;
	beds?: number;
	baths?: number;
	sqft?: number;
	propertyType?: string;
	yearBuilt?: number;
	addressLine?: string;
	city?: string;
	state?: string;
	zip?: string;
	lat?: number;
	lng?: number;
	geohash?: string;
	description?: string;
	features?: string[];
	embedding?: number[];
	heroPhoto?: any;
	photos?: any[];
	agentId?: string;
	listingAgent?: Agent;
	createdTime?: number;
	updatedTime?: number;
}

export type NewListing = Omit<Listing, 'id'>;
export type { Listing as ListingRecord };
export type ListingRecords = Listing[];
export type NewListingRecord = Omit<Listing, 'id'>;

export interface Order {
	id: string;
	createdAt?: string;
	customer?: OrderCustomer;
	eMoneyNumber?: string;
	grandTotal?: number;
	items?: OrderItem[];
	paymentMethod?: string;
	shipping?: number;
	total?: number;
	vat?: number;
}

export type NewOrder = Omit<Order, 'id'>;
export type { Order as OrderRecord };
export type OrderRecords = Order[];
export type NewOrderRecord = Omit<Order, 'id'>;

export interface Product {
	id: string;
	category?: string;
	categoryImage?: ImageSet;
	description?: string;
	features?: string;
	gallery?: Gallery;
	image?: ImageSet;
	includes?: IncludedItem[];
	name?: string;
	new?: boolean;
	ord?: number;
	others?: RelatedProduct[];
	price?: number;
	shortName?: string;
	slug?: string;
}

export type NewProduct = Omit<Product, 'id'>;
export type { Product as ProductRecord };
export type ProductRecords = Product[];
export type NewProductRecord = Omit<Product, 'id'>;

export interface SavedSearch {
	id: string;
	userId?: string;
	label?: string;
	criteria?: any;
	createdTime?: number;
}

export type NewSavedSearch = Omit<SavedSearch, 'id'>;
export type { SavedSearch as SavedSearchRecord };
export type SavedSearchRecords = SavedSearch[];
export type NewSavedSearchRecord = Omit<SavedSearch, 'id'>;

export interface TodoList {
	id: string;
	description?: string;
	status?: string;
}

export type NewTodoList = Omit<TodoList, 'id'>;
export type { TodoList as TodoListRecord };
export type TodoListRecords = TodoList[];
export type NewTodoListRecord = Omit<TodoList, 'id'>;

export interface User {
	id: string;
	createdAt?: string;
	email?: string;
}

export type NewUser = Omit<User, 'id'>;
export type { User as UserRecord };
export type UserRecords = User[];
export type NewUserRecord = Omit<User, 'id'>;

export interface harperfast_vite_vite_build_info {
	appName: string;
	status?: string;
}

export type harperfast_vite_Newvite_build_info = Omit<harperfast_vite_vite_build_info, 'appName'>;
export type { harperfast_vite_vite_build_info as harperfast_vite_vite_build_infoRecord };
export type harperfast_vite_vite_build_infoRecords = harperfast_vite_vite_build_info[];
export type harperfast_vite_Newvite_build_infoRecord = Omit<harperfast_vite_vite_build_info, 'appName'>;
