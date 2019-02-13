import React, { Component } from 'react';
import './Users.css';

class Users extends Component {
  constructor(props) {
    super();
    this.state = {
      users: []
    }
  }

  async componentDidMount() {
    const users = await fetch('/api/users', {
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json"

      }
    });
    if (users.ok) {
      const body = await users.json();
      this.setState({users: body});
    }
  }
  render() {
    return (
      <div>
        <h1>Authorized Users</h1>
        <ul>
          {
            this.state.users.map(user => {
              return <li key={user.id}>{`${user.first} ${user.last}`}</li>
            })
          }
        </ul>
      </div>
    );
  }
}

export default Users;
