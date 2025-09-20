// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_stripe_publishable_key_here';

// Initialize Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements();

// Create card element with custom styling
const cardElement = elements.create('card', {
    style: {
        base: {
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)'
            }
        },
        invalid: {
            color: '#ff6b6b',
            iconColor: '#ff6b6b'
        }
    }
});

// Mount the card element
cardElement.mount('#card-element');

// Handle real-time validation errors from the card Element
cardElement.on('change', ({error}) => {
    const displayError = document.getElementById('card-errors');
    if (error) {
        displayError.textContent = error.message;
    } else {
        displayError.textContent = '';
    }
});

// Plan data
const plans = {
    basic: {
        name: 'Early Access',
        price: '$9.99/month',
        priceId: 'price_basic'
    },
    premium: {
        name: 'VIP Access',
        price: '$19.99/month',
        priceId: 'price_premium'
    },
    ultimate: {
        name: 'Ultimate',
        price: '$39.99/month',
        priceId: 'price_ultimate'
    }
};

let selectedPlan = null;

// DOM elements
const modal = document.getElementById('payment-modal');
const closeModal = document.querySelector('.close-modal');
const planButtons = document.querySelectorAll('.plan-button');
const paymentForm = document.getElementById('payment-form');
const submitButton = document.getElementById('submit-payment');
const spinner = document.getElementById('spinner');
const buttonText = document.getElementById('button-text');

// Event listeners
planButtons.forEach(button => {
    button.addEventListener('click', function() {
        const planType = this.closest('.pricing-card').dataset.plan;
        const priceId = this.dataset.price;
        selectedPlan = { ...plans[planType], priceId };
        openPaymentModal();
    });
});

closeModal.addEventListener('click', closePaymentModal);

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === modal) {
        closePaymentModal();
    }
});

// Handle form submission
paymentForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    if (!selectedPlan) {
        alert('Please select a plan first.');
        return;
    }

    setLoading(true);

    const {error, paymentMethod} = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
            email: document.getElementById('email').value,
        },
    });

    if (error) {
        console.error('Error:', error);
        showError(error.message);
        setLoading(false);
    } else {
        // Send paymentMethod.id to your server
        handleSubscription(paymentMethod.id);
    }
});

// Functions
function openPaymentModal() {
    if (!selectedPlan) return;
    
    document.querySelector('.selected-plan-name').textContent = selectedPlan.name;
    document.querySelector('.selected-plan-price').textContent = selectedPlan.price;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form
    paymentForm.reset();
    cardElement.clear();
    document.getElementById('card-errors').textContent = '';
    setLoading(false);
}

function setLoading(isLoading) {
    if (isLoading) {
        submitButton.disabled = true;
        spinner.classList.remove('hidden');
        buttonText.textContent = 'Processing...';
    } else {
        submitButton.disabled = false;
        spinner.classList.add('hidden');
        buttonText.textContent = 'Subscribe Now';
    }
}

function showError(message) {
    const errorElement = document.getElementById('card-errors');
    errorElement.textContent = message;
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        errorElement.textContent = '';
    }, 5000);
}

async function handleSubscription(paymentMethodId) {
    try {
        // Call your backend API to create subscription
        const response = await fetch('/api/create-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentMethodId: paymentMethodId,
                priceId: selectedPlan.priceId,
                email: document.getElementById('email').value,
            }),
        });

        const result = await response.json();

        if (result.error) {
            showError(result.error);
            setLoading(false);
            return;
        }

        if (result.status === 'requires_action') {
            // Handle 3D Secure authentication
            const {error: confirmError} = await stripe.confirmCardPayment(
                result.client_secret
            );

            if (confirmError) {
                showError(confirmError.message);
                setLoading(false);
            } else {
                // Payment succeeded
                handleSubscriptionSuccess();
            }
        } else if (result.status === 'succeeded') {
            // Payment succeeded immediately
            handleSubscriptionSuccess();
        } else {
            showError('Something went wrong. Please try again.');
            setLoading(false);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Network error. Please check your connection and try again.');
        setLoading(false);
    }
}

function handleSubscriptionSuccess() {
    // Hide the modal
    closePaymentModal();
    
    // Show success message
    alert(`🎉 Welcome to ${selectedPlan.name}! Your subscription has been activated. Check your email for confirmation.`);
    
    // Optional: Redirect to a success page or update UI
    // window.location.href = '/success';
}

// Promo code functionality
document.querySelector('.code-submit').addEventListener('click', function() {
    const promoCode = document.getElementById('code-input').value.trim();
    
    if (!promoCode) {
        alert('Please enter a promo code.');
        return;
    }
    
    // Here you would typically validate the promo code with your backend
    // For now, we'll just show a placeholder message
    alert(`Promo code "${promoCode}" will be applied at checkout. ${promoCode === 'ZARA20' ? '20% discount applied!' : 'Invalid code.'}`);
    
    if (promoCode === 'ZARA20') {
        document.getElementById('code-input').style.borderColor = '#4CAF50';
        this.textContent = 'Applied ✓';
        this.style.background = '#4CAF50';
    }
});

// Add some visual feedback to plan selection
planButtons.forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.closest('.pricing-card').style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.closest('.pricing-card').style.transform = 'translateY(0) scale(1)';
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Zara subscription page loaded');
    
    // Add some entrance animations
    setTimeout(() => {
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }, 300);
});